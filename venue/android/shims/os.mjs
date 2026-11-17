// The box's own addresses, so the bridge can look for the song system next to it.
export function networkInterfaces() {
  const addresses = JSON.parse(AndroidHost.addresses());
  return { box: addresses.map((address) => ({ family: "IPv4", internal: false, address })) };
}
export default { networkInterfaces };
