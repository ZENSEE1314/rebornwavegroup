package expo.modules.lanscan

import android.content.Context
import android.net.wifi.WifiManager
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.net.DatagramPacket
import java.net.HttpURLConnection
import java.net.Inet4Address
import java.net.InetAddress
import java.net.InetSocketAddress
import java.net.MulticastSocket
import java.net.NetworkInterface
import java.net.Socket
import java.net.SocketTimeoutException
import java.net.URL
import java.net.URLDecoder
import java.util.Collections
import java.util.UUID
import java.util.concurrent.Callable
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

// Looks for CCTV cameras and TVs on the Wi-Fi the phone is connected to — the same three checks as the venue PC scanner
// (client/public/venue-scan.mjs): ONVIF cameras answer a WS-Discovery probe, TVs answer a UPnP / SSDP search, and any
// device with the camera video port (554) open is listed too. It never logs in to anything.
private const val MULTICAST_ADDRESS = "239.255.255.250"
private const val ONVIF_PORT = 3702
private const val SSDP_PORT = 1900
private const val RTSP_PORT = 554
private const val PROBE_TIMEOUT_MS = 600
private const val DESCRIPTION_TIMEOUT_MS = 2500
private const val DESCRIPTION_MAX_CHARS = 65536
private const val RTSP_THREADS = 64
private const val RTSP_TOTAL_SECONDS = 20L
private const val RECEIVE_SLICE_MS = 400

class LanScanModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("LanScan")

    AsyncFunction("scan") Coroutine { listenMs: Int ->
      return@Coroutine withContext(Dispatchers.IO) { scanNetwork(listenMs) }
    }
  }

  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  private fun scanNetwork(listenMs: Int): List<Map<String, String>> {
    // Android drops multicast traffic to save battery unless an app holds this lock.
    val wifi = context.applicationContext.getSystemService(Context.WIFI_SERVICE) as? WifiManager
    val lock = wifi?.createMulticastLock("reborn-lan-scan")
    lock?.setReferenceCounted(false)
    lock?.acquire()
    try {
      val found = Collections.synchronizedList(ArrayList<Map<String, String>>())
      val pool = Executors.newFixedThreadPool(3)
      val jobs = listOf(
        Callable { found.addAll(findOnvif(listenMs)) },
        Callable { found.addAll(findUpnp(listenMs)) },
        Callable { found.addAll(findRtsp()) }
      )
      pool.invokeAll(jobs)
      pool.shutdown()
      return ArrayList(found)
    } finally {
      lock?.release()
    }
  }

  private fun device(ip: String, kind: String, name: String, model: String, rtsp: String, via: String): Map<String, String> =
    mapOf("ip" to ip, "kind" to kind, "name" to name, "model" to model, "rtsp" to rtsp, "via" to via)

  // The Wi-Fi network card (wlan0), so the multicast question is not sent out over mobile data.
  private fun wifiInterface(): NetworkInterface? {
    val all = NetworkInterface.getNetworkInterfaces()?.toList() ?: return null
    return all.firstOrNull { network ->
      network.isUp && !network.isLoopback && network.supportsMulticast() && network.name.startsWith("wlan") &&
        network.inetAddresses.toList().any { address -> address is Inet4Address }
    }
  }

  // Sends one multicast question and collects the (address, text) of every answer until the time is up.
  private fun ask(port: Int, message: ByteArray, listenMs: Int): List<Pair<String, String>> {
    val replies = ArrayList<Pair<String, String>>()
    val socket = try { MulticastSocket() } catch (error: Exception) { return replies }
    try {
      val wifi = wifiInterface()
      if (wifi != null) socket.networkInterface = wifi
      socket.soTimeout = RECEIVE_SLICE_MS
      socket.send(DatagramPacket(message, message.size, InetAddress.getByName(MULTICAST_ADDRESS), port))
      val deadline = System.currentTimeMillis() + listenMs
      val buffer = ByteArray(8192)
      while (System.currentTimeMillis() < deadline) {
        try {
          val packet = DatagramPacket(buffer, buffer.size)
          socket.receive(packet)
          replies.add(Pair(packet.address.hostAddress ?: "", String(packet.data, 0, packet.length, Charsets.UTF_8)))
        } catch (timeout: SocketTimeoutException) {
          // nothing yet: keep listening until the deadline
        }
      }
    } catch (error: Exception) {
      // no Wi-Fi or no multicast: the other checks still run
    } finally {
      socket.close()
    }
    return replies
  }

  private fun findOnvif(listenMs: Int): List<Map<String, String>> {
    val probe = "<?xml version=\"1.0\"?><e:Envelope xmlns:e=\"http://www.w3.org/2003/05/soap-envelope\" " +
      "xmlns:w=\"http://schemas.xmlsoap.org/ws/2004/08/addressing\" xmlns:d=\"http://schemas.xmlsoap.org/ws/2005/04/discovery\" " +
      "xmlns:dn=\"http://www.onvif.org/ver10/network/wsdl\"><e:Header><w:MessageID>uuid:" + UUID.randomUUID() + "</w:MessageID>" +
      "<w:To>urn:schemas-xmlsoap-org:ws:2005:04:discovery</w:To><w:Action>http://schemas.xmlsoap.org/ws/2005/04/discovery/Probe</w:Action></e:Header>" +
      "<e:Body><d:Probe><d:Types>dn:NetworkVideoTransmitter</d:Types></d:Probe></e:Body></e:Envelope>"
    val nameRegex = Regex("onvif://www\\.onvif\\.org/name/([^\\s<]+)")
    val hardwareRegex = Regex("onvif://www\\.onvif\\.org/hardware/([^\\s<]+)")
    return ask(ONVIF_PORT, probe.toByteArray(Charsets.UTF_8), listenMs).map { (ip, text) ->
      val name = nameRegex.find(text)?.groupValues?.get(1)?.let { decode(it) } ?: ""
      val model = hardwareRegex.find(text)?.groupValues?.get(1)?.let { decode(it) } ?: ""
      device(ip, "camera", if (name.isEmpty()) "ONVIF camera" else name, model, "rtsp://$ip:$RTSP_PORT/", "onvif")
    }
  }

  private fun decode(text: String): String = try { URLDecoder.decode(text, "UTF-8") } catch (error: Exception) { text }

  private fun findUpnp(listenMs: Int): List<Map<String, String>> {
    val search = "M-SEARCH * HTTP/1.1\r\nHOST: $MULTICAST_ADDRESS:$SSDP_PORT\r\nMAN: \"ssdp:discover\"\r\nMX: 2\r\nST: ssdp:all\r\n\r\n"
    val locationRegex = Regex("(?im)^location:\\s*(\\S+)")
    val locations = LinkedHashMap<String, String>()
    for ((ip, text) in ask(SSDP_PORT, search.toByteArray(Charsets.UTF_8), listenMs)) {
      val location = locationRegex.find(text)?.groupValues?.get(1)
      if (location != null && !locations.containsKey(ip)) locations[ip] = location
    }
    val tvRegex = Regex("MediaRenderer|Television|dial", RegexOption.IGNORE_CASE)
    val tvNameRegex = Regex("tv|bravia|webos|roku|samsung|lg|vizio|chromecast", RegexOption.IGNORE_CASE)
    val found = ArrayList<Map<String, String>>()
    for ((ip, location) in locations) {
      val xml = download(location) ?: continue
      val friendly = tag(xml, "friendlyName")
      val model = listOf(tag(xml, "manufacturer"), tag(xml, "modelName")).filter { it.isNotEmpty() }.joinToString(" ")
      val isTv = tvRegex.containsMatchIn(xml) || tvNameRegex.containsMatchIn("$friendly $model")
      if (isTv && !xml.contains("InternetGatewayDevice")) found.add(device(ip, "tv", if (friendly.isEmpty()) "TV" else friendly, model, "", "upnp"))
    }
    return found
  }

  private fun tag(xml: String, name: String): String =
    Regex("<$name>([^<]*)</$name>").find(xml)?.groupValues?.get(1)?.trim() ?: ""

  private fun download(address: String): String? {
    return try {
      val connection = URL(address).openConnection() as HttpURLConnection
      connection.connectTimeout = DESCRIPTION_TIMEOUT_MS
      connection.readTimeout = DESCRIPTION_TIMEOUT_MS
      try {
        connection.inputStream.bufferedReader().use { it.readText() }.take(DESCRIPTION_MAX_CHARS)
      } finally {
        connection.disconnect()
      }
    } catch (error: Exception) {
      null
    }
  }

  // The first three numbers of this phone's Wi-Fi address (192.168.1 …): every address on that network is tried.
  private fun localBases(): List<String> {
    val bases = LinkedHashSet<String>()
    val all = NetworkInterface.getNetworkInterfaces()?.toList() ?: return emptyList()
    for (network in all) {
      if (!network.isUp || network.isLoopback) continue
      for (address in network.inetAddresses.toList()) {
        if (address is Inet4Address && address.isSiteLocalAddress) {
          val text = address.hostAddress ?: continue
          bases.add(text.substringBeforeLast('.'))
        }
      }
    }
    return bases.toList()
  }

  private fun portOpen(host: String, port: Int): Boolean {
    return try {
      Socket().use { socket ->
        socket.connect(InetSocketAddress(host, port), PROBE_TIMEOUT_MS)
        true
      }
    } catch (error: Exception) {
      false
    }
  }

  private fun findRtsp(): List<Map<String, String>> {
    val hosts = ArrayList<String>()
    for (base in localBases()) for (last in 1..254) hosts.add("$base.$last")
    val open = Collections.synchronizedList(ArrayList<String>())
    val pool = Executors.newFixedThreadPool(RTSP_THREADS)
    try {
      val tasks = hosts.map { host -> Callable { if (portOpen(host, RTSP_PORT)) open.add(host); true } }
      pool.invokeAll(tasks, RTSP_TOTAL_SECONDS, TimeUnit.SECONDS)
    } finally {
      pool.shutdownNow()
    }
    return ArrayList(open).map { ip -> device(ip, "camera", "Camera / video recorder", "", "rtsp://$ip:$RTSP_PORT/", "port 554") }
  }
}
