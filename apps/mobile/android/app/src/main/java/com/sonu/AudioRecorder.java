package com.sonu;

import android.media.AudioFormat;
import android.media.AudioRecord;
import android.media.MediaRecorder;
import android.util.Log;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;

/**
 * Audio recorder for capturing audio and converting to WAV format
 */
public class AudioRecorder {
    private static final String TAG = "AudioRecorder";
    private static final int SAMPLE_RATE = 16000; // Whisper requires 16kHz
    private static final int CHANNEL_CONFIG = AudioFormat.CHANNEL_IN_MONO;
    private static final int AUDIO_FORMAT = AudioFormat.ENCODING_PCM_16BIT;
    
    private AudioRecord audioRecord;
    private boolean isRecording = false;
    private Thread recordingThread;
    private File outputFile;
    
    /**
     * Start recording audio to a file
     * @param outputFile File to save the recording
     * @return true if recording started successfully
     */
    public boolean startRecording(File outputFile) {
        if (isRecording) {
            Log.w(TAG, "Already recording");
            return false;
        }
        
        this.outputFile = outputFile;
        
        int bufferSize = AudioRecord.getMinBufferSize(SAMPLE_RATE, CHANNEL_CONFIG, AUDIO_FORMAT);
        if (bufferSize == AudioRecord.ERROR_BAD_VALUE || bufferSize == AudioRecord.ERROR) {
            Log.e(TAG, "Invalid buffer size");
            return false;
        }
        
        audioRecord = new AudioRecord(
            MediaRecorder.AudioSource.MIC,
            SAMPLE_RATE,
            CHANNEL_CONFIG,
            AUDIO_FORMAT,
            bufferSize * 2
        );
        
        if (audioRecord.getState() != AudioRecord.STATE_INITIALIZED) {
            Log.e(TAG, "AudioRecord initialization failed");
            return false;
        }
        
        audioRecord.startRecording();
        isRecording = true;
        
        recordingThread = new Thread(this::recordAudio, "AudioRecorder");
        recordingThread.start();
        
        Log.d(TAG, "Recording started");
        return true;
    }
    
    /**
     * Stop recording
     * @return true if stopped successfully
     */
    public boolean stopRecording() {
        if (!isRecording) {
            return false;
        }
        
        isRecording = false;
        
        if (audioRecord != null) {
            try {
                audioRecord.stop();
                audioRecord.release();
                audioRecord = null;
            } catch (IllegalStateException e) {
                Log.e(TAG, "Error stopping AudioRecord", e);
            }
        }
        
        if (recordingThread != null) {
            try {
                recordingThread.join(1000);
            } catch (InterruptedException e) {
                Log.e(TAG, "Error joining recording thread", e);
            }
        }
        
        Log.d(TAG, "Recording stopped");
        return true;
    }
    
    private void recordAudio() {
        FileOutputStream fos = null;
        try {
            // Create parent directory if needed
            if (outputFile.getParentFile() != null) {
                outputFile.getParentFile().mkdirs();
            }
            
            fos = new FileOutputStream(outputFile);
            
            // Write WAV header (will be updated later with correct file size)
            writeWavHeader(fos, 0);
            
            byte[] buffer = new byte[4096];
            long totalBytes = 0;
            
            while (isRecording && audioRecord != null) {
                int bytesRead = audioRecord.read(buffer, 0, buffer.length);
                if (bytesRead > 0) {
                    fos.write(buffer, 0, bytesRead);
                    totalBytes += bytesRead;
                } else if (bytesRead == AudioRecord.ERROR_INVALID_OPERATION) {
                    Log.e(TAG, "Invalid operation during read");
                    break;
                } else if (bytesRead == AudioRecord.ERROR_BAD_VALUE) {
                    Log.e(TAG, "Bad value during read");
                    break;
                }
            }
            
            // Update WAV header with actual file size
            fos.close();
            updateWavHeader(outputFile, totalBytes);
            
        } catch (IOException e) {
            Log.e(TAG, "Error writing audio file", e);
        } finally {
            if (fos != null) {
                try {
                    fos.close();
                } catch (IOException e) {
                    Log.e(TAG, "Error closing file", e);
                }
            }
        }
    }
    
    private void writeWavHeader(FileOutputStream fos, long dataSize) throws IOException {
        // WAV header structure
        ByteBuffer header = ByteBuffer.allocate(44);
        header.order(ByteOrder.LITTLE_ENDIAN);
        
        // RIFF header
        header.put("RIFF".getBytes());
        header.putInt((int) (36 + dataSize)); // File size - 8
        header.put("WAVE".getBytes());
        
        // fmt chunk
        header.put("fmt ".getBytes());
        header.putInt(16); // fmt chunk size
        header.putShort((short) 1); // Audio format (PCM)
        header.putShort((short) 1); // Number of channels (mono)
        header.putInt(SAMPLE_RATE); // Sample rate
        header.putInt(SAMPLE_RATE * 2); // Byte rate
        header.putShort((short) 2); // Block align
        header.putShort((short) 16); // Bits per sample
        
        // data chunk
        header.put("data".getBytes());
        header.putInt((int) dataSize); // Data size (will be updated)
        
        fos.write(header.array());
    }
    
    private void updateWavHeader(File file, long dataSize) {
        try (java.io.RandomAccessFile raf = new java.io.RandomAccessFile(file, "rw")) {
            // Update file size in RIFF header
            raf.seek(4);
            raf.writeInt((int) (36 + dataSize));
            
            // Update data chunk size
            raf.seek(40);
            raf.writeInt((int) dataSize);
        } catch (IOException e) {
            Log.e(TAG, "Error updating WAV header", e);
        }
    }
    
    public boolean isRecording() {
        return isRecording;
    }
}

