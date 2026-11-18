package group.rebornwave.tvoverlay;

import androidx.media3.common.C;
import androidx.media3.common.audio.AudioProcessor;
import androidx.media3.common.audio.BaseAudioProcessor;
import androidx.media3.common.util.UnstableApi;

import java.nio.ByteBuffer;

/**
 * Plays one channel of a stereo karaoke video on both speakers: many karaoke videos keep the singer's voice on one channel and the music on the
 * other. The choice can change while a song plays (no reconfiguring), and anything that is not 16-bit stereo passes untouched.
 */
@UnstableApi
final class VoiceChannels extends BaseAudioProcessor {
    static final int BOTH = 0;
    static final int LEFT_ONLY = 1;
    static final int RIGHT_ONLY = 2;

    private static final int BYTES_PER_FRAME = 4; // two channels of 16 bits

    private volatile int mode = BOTH;

    void setMode(int newMode) {
        mode = newMode;
    }

    @Override
    protected AudioProcessor.AudioFormat onConfigure(AudioProcessor.AudioFormat inputAudioFormat) {
        boolean isStereo16 = inputAudioFormat.encoding == C.ENCODING_PCM_16BIT && inputAudioFormat.channelCount == 2;
        return isStereo16 ? inputAudioFormat : AudioProcessor.AudioFormat.NOT_SET;
    }

    @Override
    public void queueInput(ByteBuffer input) {
        int size = input.remaining();
        if (size == 0) return;
        ByteBuffer output = replaceOutputBuffer(size);
        int chosen = mode;
        while (input.remaining() >= BYTES_PER_FRAME) {
            short left = input.getShort();
            short right = input.getShort();
            if (chosen == LEFT_ONLY) right = left;
            else if (chosen == RIGHT_ONLY) left = right;
            output.putShort(left);
            output.putShort(right);
        }
        output.flip();
    }
}
