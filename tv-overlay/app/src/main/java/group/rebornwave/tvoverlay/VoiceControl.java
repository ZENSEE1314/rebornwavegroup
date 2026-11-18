package group.rebornwave.tvoverlay;

import android.content.Context;

import androidx.media3.common.C;
import androidx.media3.common.TrackSelectionOverride;
import androidx.media3.common.Tracks;
import androidx.media3.common.audio.AudioProcessor;
import androidx.media3.common.util.UnstableApi;
import androidx.media3.exoplayer.DefaultRenderersFactory;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.exoplayer.RenderersFactory;
import androidx.media3.exoplayer.audio.AudioSink;
import androidx.media3.exoplayer.audio.DefaultAudioSink;

import java.util.ArrayList;
import java.util.List;

/**
 * The singer's voice on / off of a song video. A karaoke video keeps the original singing and the music apart either as two sound tracks or as
 * the two channels of one track; which one holds the singer's voice is a setting of the box (BridgeSettings.isVoiceFirst: the first track / left
 * channel). Two or more tracks switch the track; one stereo track switches the channel only when the box is set to channels (isChannelVoice).
 */
@UnstableApi
final class VoiceControl {
    private final Context context;
    private final VoiceChannels channels = new VoiceChannels();

    VoiceControl(Context context) {
        this.context = context.getApplicationContext();
    }

    /** The renderers the player must be built with, so the channel choice reaches the speakers. */
    RenderersFactory renderers() {
        return new DefaultRenderersFactory(context) {
            @Override
            protected AudioSink buildAudioSink(Context sinkContext, boolean enableFloatOutput, boolean enableAudioOutputPlaybackParams) {
                return new DefaultAudioSink.Builder(sinkContext).setAudioProcessors(new AudioProcessor[]{channels}).build();
            }
        };
    }

    /** Switches the playing video to the singer's own voice (`original`) or to the music only. Safe to call again with the same choice. */
    void apply(ExoPlayer player, boolean original) {
        boolean voiceFirst = BridgeSettings.isVoiceFirst(context);
        boolean firstOne = original == voiceFirst; // the first track / the left channel is the one wanted
        List<Tracks.Group> audio = new ArrayList<Tracks.Group>();
        for (Tracks.Group group : player.getCurrentTracks().getGroups()) if (group.getType() == C.TRACK_TYPE_AUDIO) audio.add(group);
        if (audio.size() >= 2) {
            channels.setMode(VoiceChannels.BOTH);
            TrackSelectionOverride choice = new TrackSelectionOverride(audio.get(firstOne ? 0 : 1).getMediaTrackGroup(), 0);
            player.setTrackSelectionParameters(player.getTrackSelectionParameters().buildUpon().setOverrideForType(choice).build());
        } else if (BridgeSettings.isChannelVoice(context)) {
            channels.setMode(firstOne ? VoiceChannels.LEFT_ONLY : VoiceChannels.RIGHT_ONLY);
        } else {
            channels.setMode(VoiceChannels.BOTH);
        }
    }
}
