package com.sonu;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.widget.Button;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import java.io.File;

public class MainActivity extends AppCompatActivity {
    private static final int PERMISSION_REQUEST_RECORD_AUDIO = 1;
    private static final String TAG = "MainActivity";
    
    private WhisperService whisperService;
    private AudioRecorder audioRecorder;
    private ModelManager modelManager;
    
    private TextView tvStatus;
    private TextView tvTranscription;
    private Button btnRecord;
    private Button btnTranscribe;
    private Button btnDownloadModel;
    private ProgressBar progressBar;
    
    private File recordingFile;
    private ModelManager.ModelType currentModel = ModelManager.ModelType.TINY;
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        
        initViews();
        initServices();
        checkPermissions();
        checkModelStatus();
    }
    
    private void initViews() {
        tvStatus = findViewById(R.id.tvStatus);
        tvTranscription = findViewById(R.id.tvTranscription);
        btnRecord = findViewById(R.id.btnRecord);
        btnTranscribe = findViewById(R.id.btnTranscribe);
        btnDownloadModel = findViewById(R.id.btnDownloadModel);
        progressBar = findViewById(R.id.progressBar);
        
        btnRecord.setOnClickListener(v -> toggleRecording());
        btnTranscribe.setOnClickListener(v -> transcribeRecording());
        btnDownloadModel.setOnClickListener(v -> showModelDialog());
    }
    
    private void initServices() {
        whisperService = new WhisperService();
        audioRecorder = new AudioRecorder();
        modelManager = new ModelManager(this);
        
        // Get recording file path
        File recordingsDir = new File(getFilesDir(), "recordings");
        recordingsDir.mkdirs();
        recordingFile = new File(recordingsDir, "recording.wav");
    }
    
    private void checkPermissions() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO)
                != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this,
                    new String[]{Manifest.permission.RECORD_AUDIO},
                    PERMISSION_REQUEST_RECORD_AUDIO);
        }
    }
    
    private void checkModelStatus() {
        if (modelManager.isModelDownloaded(currentModel)) {
            loadModel();
        } else {
            tvStatus.setText("Model not loaded. Please download a model.");
            btnRecord.setEnabled(false);
            btnTranscribe.setEnabled(false);
        }
    }
    
    private void loadModel() {
        File modelFile = modelManager.getModelFile(currentModel);
        if (modelFile.exists()) {
            new Thread(() -> {
                boolean success = whisperService.initContext(modelFile.getAbsolutePath());
                new Handler(Looper.getMainLooper()).post(() -> {
                    if (success) {
                        tvStatus.setText("Model loaded: " + currentModel.filename);
                        btnRecord.setEnabled(true);
                        Toast.makeText(this, "Model loaded successfully", Toast.LENGTH_SHORT).show();
                    } else {
                        tvStatus.setText("Failed to load model");
                        Toast.makeText(this, "Failed to load model", Toast.LENGTH_LONG).show();
                    }
                });
            }).start();
        }
    }
    
    private void showModelDialog() {
        AlertDialog.Builder builder = new AlertDialog.Builder(this);
        builder.setTitle("Select Model");
        
        String[] models = {
            "Tiny (75MB) - Fastest",
            "Base (142MB) - Balanced",
            "Small (466MB) - Best Quality"
        };
        
        builder.setItems(models, (dialog, which) -> {
            ModelManager.ModelType[] types = {
                ModelManager.ModelType.TINY,
                ModelManager.ModelType.BASE,
                ModelManager.ModelType.SMALL
            };
            currentModel = types[which];
            downloadModel(currentModel);
        });
        
        builder.show();
    }
    
    private void downloadModel(ModelManager.ModelType modelType) {
        if (modelManager.isModelDownloaded(modelType)) {
            currentModel = modelType;
            loadModel();
            return;
        }
        
        progressBar.setVisibility(View.VISIBLE);
        tvStatus.setText("Downloading model: " + modelType.filename);
        btnDownloadModel.setEnabled(false);
        btnRecord.setEnabled(false);
        btnTranscribe.setEnabled(false);
        
        new Thread(() -> {
            boolean success = modelManager.downloadModel(modelType, progress -> {
                new Handler(Looper.getMainLooper()).post(() -> {
                    progressBar.setProgress(progress);
                    if (progress == 100) {
                        progressBar.setVisibility(View.GONE);
                        btnDownloadModel.setEnabled(true);
                        currentModel = modelType;
                        loadModel();
                    }
                });
            });
            
            new Handler(Looper.getMainLooper()).post(() -> {
                if (!success) {
                    progressBar.setVisibility(View.GONE);
                    btnDownloadModel.setEnabled(true);
                    tvStatus.setText("Download failed");
                    Toast.makeText(this, "Model download failed", Toast.LENGTH_LONG).show();
                }
            });
        }).start();
    }
    
    private void toggleRecording() {
        if (audioRecorder.isRecording()) {
            stopRecording();
        } else {
            startRecording();
        }
    }
    
    private void startRecording() {
        if (!hasAudioPermission()) {
            checkPermissions();
            return;
        }
        
        if (recordingFile.exists()) {
            recordingFile.delete();
        }
        
        if (audioRecorder.startRecording(recordingFile)) {
            btnRecord.setText("Stop");
            tvStatus.setText("Recording...");
            btnTranscribe.setEnabled(false);
        } else {
            Toast.makeText(this, "Failed to start recording", Toast.LENGTH_SHORT).show();
        }
    }
    
    private void stopRecording() {
        audioRecorder.stopRecording();
        btnRecord.setText("Record");
        tvStatus.setText("Recording stopped");
        btnTranscribe.setEnabled(true);
        Toast.makeText(this, "Recording saved", Toast.LENGTH_SHORT).show();
    }
    
    private void transcribeRecording() {
        if (!recordingFile.exists()) {
            Toast.makeText(this, "No recording found", Toast.LENGTH_SHORT).show();
            return;
        }
        
        if (!whisperService.isInitialized()) {
            Toast.makeText(this, "Model not initialized", Toast.LENGTH_SHORT).show();
            return;
        }
        
        progressBar.setVisibility(View.VISIBLE);
        tvStatus.setText("Transcribing...");
        btnTranscribe.setEnabled(false);
        tvTranscription.setText("");
        
        new Thread(() -> {
            String result = whisperService.transcribe(recordingFile.getAbsolutePath());
            
            new Handler(Looper.getMainLooper()).post(() -> {
                progressBar.setVisibility(View.GONE);
                btnTranscribe.setEnabled(true);
                
                if (result != null && !result.startsWith("Error:")) {
                    tvTranscription.setText(result);
                    tvStatus.setText("Transcription complete");
                } else {
                    tvStatus.setText("Transcription failed");
                    tvTranscription.setText(result != null ? result : "Unknown error");
                    Toast.makeText(this, "Transcription failed", Toast.LENGTH_LONG).show();
                }
            });
        }).start();
    }
    
    private boolean hasAudioPermission() {
        return ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO)
                == PackageManager.PERMISSION_GRANTED;
    }
    
    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions,
                                           @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        
        if (requestCode == PERMISSION_REQUEST_RECORD_AUDIO) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                Toast.makeText(this, "Microphone permission granted", Toast.LENGTH_SHORT).show();
            } else {
                Toast.makeText(this, "Microphone permission denied", Toast.LENGTH_LONG).show();
            }
        }
    }
    
    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (audioRecorder != null && audioRecorder.isRecording()) {
            audioRecorder.stopRecording();
        }
        if (whisperService != null && whisperService.isInitialized()) {
            whisperService.freeContext();
        }
    }
}

