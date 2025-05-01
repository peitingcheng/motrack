class ResultDisplay {
  constructor() {
    this.replayStartTime = 0;
    this.resetButton = null;
    this.downloadButton = null;
    this.isReplaying = false;
  }

  setup() {
    // 創建 reset 按鈕
    this.resetButton = createButton('RESET');
    this.resetButton.position(width/2 - 50, height - 60);
    this.resetButton.size(100, 40);
    this.resetButton.style('font-size', '16px');
    this.resetButton.style('background-color', '#ffffff');
    this.resetButton.style('border', 'none');
    this.resetButton.style('border-radius', '20px');
    this.resetButton.style('cursor', 'pointer');
    this.resetButton.style('z-index', '1');
    this.resetButton.style('position', 'fixed');
    this.resetButton.mousePressed(() => this.reset());
    this.resetButton.hide();

    // 創建 download 按鈕
    this.downloadButton = createButton('DOWNLOAD');
    this.downloadButton.position(width/2 + 60, height - 60);
    this.downloadButton.size(150, 40);
    this.downloadButton.style('font-size', '16px');
    this.downloadButton.style('background-color', '#ffffff');
    this.downloadButton.style('border', 'none');
    this.downloadButton.style('border-radius', '20px');
    this.downloadButton.style('cursor', 'pointer');
    this.downloadButton.style('z-index', '1');
    this.downloadButton.style('position', 'fixed');
    this.downloadButton.mousePressed(() => this.download());
    this.downloadButton.hide();
  }

  startReplay() {
    this.isReplaying = true;
    this.replayStartTime = millis();
    this.resetButton.show();
    this.downloadButton.show();
  }

  draw(videoStream, recordedPoses, currentHue, drawPoseSet) {
    if (!this.isReplaying) return;

    // 水平翻轉攝影機畫面
    push();
    translate(width, 0);
    scale(-1, 1);
    
    let replayTime = millis() - this.replayStartTime;
    let frameIndex = Math.floor((replayTime / RECORDING_DURATION) * recordedPoses.length);
    
    // 重播結束時重新開始
    if (frameIndex >= recordedPoses.length) {
      this.replayStartTime = millis();
      frameIndex = 0;
    }
    
    // 使用時間戳記來更精確地重播
    let currentPose = recordedPoses[frameIndex];
    if (currentPose) {
      drawPoseSet(
        [{ keypoints: currentPose.keypoints }],
        color(currentHue, 80, 90, 255),
        color((currentHue + 120) % 360, 80, 90, 255),
        color((currentHue + 240) % 360, 80, 90, 255),
        color((currentHue + 30) % 360, 80, 90, 255),
        color((currentHue - 30) % 360, 80, 90, 255)
      );
    }
    pop();
  }

  reset() {
    this.isReplaying = false;
    this.resetButton.hide();
    this.downloadButton.hide();
    // 觸發重置事件
    if (typeof window.onReset === 'function') {
      window.onReset();
    }
  }

  download() {
    // 觸發下載事件
    if (typeof window.onDownload === 'function') {
      window.onDownload();
    }
  }
} 