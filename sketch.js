/*
 * this project is developed based on ml5.js: https://ml5js.org/
 * ml5.js license and Code of Conduct: https://github.com/ml5js/ml5-next-gen/blob/main/LICENSE.md
 */

let videoStream;
let bodyPoseDetector;
let poses = [];
let connections;
let isDetecting = false;
let toggleButton;
let recordedPoses = [];
let lastRecordTime = 0;
const RECORD_INTERVAL = 333;

// 新增計時相關變數
let startTime = 0;
let showingPrompt = true;
let isCountingDown = false;
const PROMPT_DURATION = 5000; // 提示文字顯示5秒
const COUNTDOWN_DURATION = 3000; // 倒數3秒
const RECORDING_DURATION = 5000; // 錄製5秒
let isReplaying = false;
let replayStartTime = 0;

// 新增 Y-pose 偵測相關變數
let yPoseStartTime = 0;
let isHoldingYPose = false;
const YPOSE_HOLD_DURATION = 2000; // 需要保持 Y-pose 2秒

// 新增字體變數
let myFont;
let myFontBold;

// 新增 reset 按鈕變數
let resetButton;

// 新增等待開始錄製的狀態
let waitingToStart = false;
let startButton;

// 新增下載按鈕變數
let downloadButton;

// 新增顏色相關變數
let currentHue;

// 新增情緒表達列表
const emotions = [
  "I'm so happy",
  "I love you",
  "I'm so frustrated",
  "I'm feeling sorrow",
  "I'm so excited"
];

// 新增當前情緒變數
let currentEmotion;

function preload() {
  // Load the bodyPose model
  bodyPoseDetector = ml5.bodyPose('BlazePose', { flipped: true });
  
  // fonts
  myFont = loadFont('assets/font/Favorit-Inter.otf');
  myFontBold = loadFont('assets/font/Favorit-Bold.otf');
}

function setup() {
  createCanvas(1080, 1920);
  background(0);
  // 設定使用 HSB 顏色模式
  colorMode(HSB, 360, 100, 100, 255);
  // 產生隨機色相
  currentHue = random(360);

  // 隨機選擇一個情緒
  currentEmotion = random(emotions);

  // 創建攝影機串流
  try {
    videoStream = createCapture(VIDEO, { 
      flipped: true,
      audio: false,
      video: {
        width: { ideal: 1080 },
        height: { ideal: 1920 },
      }
    });
    
    videoStream.hide();

    // 創建 start 按鈕
    startButton = createButton('START RECORDING');
    startButton.position(width/2 - 100, height - 100);
    startButton.size(200, 50);
    startButton.style('font-size', '20px');
    startButton.style('background-color', '#ffffff');
    startButton.style('border', 'none');
    startButton.style('border-radius', '25px');
    startButton.style('cursor', 'pointer');
    startButton.style('z-index', '1');
    startButton.style('position', 'fixed');
    startButton.mousePressed(startRecording);

    // 創建 reset 按鈕（一開始隱藏）
    resetButton = createButton('RESET');
    resetButton.position(width/2 - 50, height - 60);
    resetButton.size(100, 40);
    resetButton.style('font-size', '16px');
    resetButton.style('background-color', '#ffffff');
    resetButton.style('border', 'none');
    resetButton.style('border-radius', '20px');
    resetButton.style('cursor', 'pointer');
    resetButton.style('z-index', '1');
    resetButton.style('position', 'fixed');
    resetButton.mousePressed(resetAll);
    resetButton.hide();

    // 創建 download 按鈕（一開始隱藏）
    downloadButton = createButton('DOWNLOAD');
    downloadButton.position(width/2 + 60, height - 60);
    downloadButton.size(150, 40);
    downloadButton.style('font-size', '16px');
    downloadButton.style('background-color', '#ffffff');
    downloadButton.style('border', 'none');
    downloadButton.style('border-radius', '20px');
    downloadButton.style('cursor', 'pointer');
    downloadButton.style('z-index', '1');
    downloadButton.style('position', 'fixed');
    downloadButton.mousePressed(downloadRecording);
    downloadButton.hide();

    connections = bodyPoseDetector.getConnections();
    
    // 設定開始時間
    startTime = millis();
  } catch (error) {
    console.error('Error accessing camera:', error);
  }

  // 當提示結束時開始檢測骨架
  setTimeout(() => {
    showingPrompt = false;
    waitingToStart = true;
    startPoseDetection();
  }, PROMPT_DURATION);
}

function draw() {
  background(0);
  
  // 顯示提示文字階段
  if (showingPrompt) {
    textAlign(CENTER, CENTER);
    fill(255);
    
    // 計算文字位置
    let y = height/2;
    
    // "How do you express" 使用 Inter
    textFont(myFont);
    textSize(32);
    text('How do you express', width/2, y - 40);
    
    // 當前選擇的情緒 使用 Medium
    textFont(myFontBold);
    textSize(32);
    text(`"${currentEmotion}"`, width/2, y);
    
    // "with your body?" 使用 Inter
    textFont(myFont);
    textSize(32);
    text('with your body?', width/2, y + 40);
    
    if (millis() - startTime > PROMPT_DURATION) {
      showingPrompt = false;
      waitingToStart = true;
      startTime = millis();
    }
    return;
  }

  // 等待開始錄製階段
  if (waitingToStart) {
    // 水平翻轉攝影機畫面
    push();
    translate(width, 0);
    scale(-1, 1);
    image(videoStream, 0, 0, width, height);
    pop();
    
    // 顯示骨架
    if (poses.length > 0) {
      // 繪製骨架連接線
      for (let connection of connections) {
        let pointA = poses[0].keypoints[connection[0]];
        let pointB = poses[0].keypoints[connection[1]];
        if (pointA.confidence > 0.1 && pointB.confidence > 0.1) {
          stroke(255, 255, 0); // 黃色線條
          strokeWeight(3);
          line(pointA.x, pointA.y, pointB.x, pointB.y);
        }
      }
      
      // 繪製關鍵點
      for (let keypoint of poses[0].keypoints) {
        if (keypoint.confidence > 0.1) {
          fill(255, 0, 0); // 紅色點
          noStroke();
          circle(keypoint.x, keypoint.y, 8);
        }
      }
    }
    
    // 顯示提示文字
    textAlign(CENTER, CENTER);
    fill(255);
    textFont(myFont);
    textSize(32);
    
    if (isHoldingYPose) {
      // 顯示保持 Y-pose 的進度
      let progress = (millis() - yPoseStartTime) / YPOSE_HOLD_DURATION;
      let progressText = `Hold Y-pose: ${ceil(progress * 100)}%`;
      text(progressText, width/2, height - 200);
    } else {
      text('Make a Y-pose to start recording', width/2, height - 200);
    }
    
    return;
  }

  // 倒數計時階段
  if (isCountingDown) {
    // 水平翻轉攝影機畫面
    push();
    translate(width, 0);
    scale(-1, 1);
    image(videoStream, 0, 0, width, height);
    pop();
    
    let timeLeft = ceil((COUNTDOWN_DURATION - (millis() - startTime)) / 1000);
    textSize(128);
    textAlign(CENTER, CENTER);
    fill(255);
    text(timeLeft, width/2, height/2);

    if (millis() - startTime > COUNTDOWN_DURATION) {
      isCountingDown = false;
      isDetecting = true;
      bodyPoseDetector.detectStart(videoStream, gotPoses);
      startTime = millis();
    }
    return;
  }

  // 錄製階段
  if (isDetecting) {
    // 水平翻轉攝影機畫面
    push();
    translate(width, 0);
    scale(-1, 1);
    image(videoStream, 0, 0, width, height);
    pop();
    
    // 檢查是否達到錄製時間
    if (millis() - startTime > RECORDING_DURATION) {
      isDetecting = false;
      bodyPoseDetector.detectStop();
      poses = [];
      isReplaying = true;
      replayStartTime = millis();
    }
    
    // 記錄姿勢
    if (poses.length > 0 && millis() - lastRecordTime > RECORD_INTERVAL) {
      let poseWithTimestamp = {
        timestamp: millis() - startTime,
        keypoints: JSON.parse(JSON.stringify(poses[0].keypoints))
      };
      recordedPoses.push(poseWithTimestamp);
      lastRecordTime = millis();
    }

    // 顯示剩餘錄製時間
    let recordingTimeLeft = ceil((RECORDING_DURATION - (millis() - startTime)) / 1000);
    textSize(32);
    textAlign(RIGHT, TOP);
    fill(255);
    text(recordingTimeLeft, width - 20, 20);

    // 即時骨架 - 使用當前的色相
    if (poses.length > 0) {
      push();
      translate(width, 0);
      scale(-1, 1);
      drawPoseSet(
        poses, 
        color(currentHue, 80, 90), // 主要顏色
        color((currentHue + 120) % 360, 80, 90), // +120度
        color((currentHue + 240) % 360, 80, 90), // +240度
        color((currentHue + 30) % 360, 80, 90), // +30度
        color((currentHue - 30) % 360, 80, 90) // -30度
      );
      pop();
    }
  }

  // 重播階段
  if (isReplaying) {
    // 水平翻轉攝影機畫面
    push();
    translate(width, 0);
    scale(-1, 1);
    
    
    // 顯示 reset 和 download 按鈕
    resetButton.show();
    downloadButton.show();
    
    let replayTime = millis() - replayStartTime;
    let frameIndex = Math.floor((replayTime / RECORDING_DURATION) * recordedPoses.length);
    
    // 重播結束時重新開始
    if (frameIndex >= recordedPoses.length) {
      replayStartTime = millis();
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
    
  } else {
    // 確保在非重播階段隱藏按鈕
    resetButton.hide();
    downloadButton.hide();
  }
}

// 修改繪製骨架的函數
function drawPoseSet(poseSet, lineColor, pointColor1, pointColor2, pointColor3, pointColor4) {
  for (let pose of poseSet) {
    // 繪製骨架連接線
    for (let connection of connections) {
      let pointA = pose.keypoints[connection[0]];
      let pointB = pose.keypoints[connection[1]];
      if (pointA.confidence > 0.1 && pointB.confidence > 0.1) {
        stroke(lineColor);
        strokeWeight(5);
        // 翻轉 x 座標
        let flippedAX = width - pointA.x;
        let flippedBX = width - pointB.x;
        line(flippedAX, pointA.y, flippedBX, pointB.y);
      }
    }

    // 繪製關鍵點
    for (let keypoint of pose.keypoints) {
      if (keypoint.confidence > 0.1) {
        fill(pointColor1);
        noStroke();
        // 翻轉 x 座標
        let flippedX = width - keypoint.x;
        circle(flippedX, keypoint.y, 10);
      }
    }
  } 
}

// 計算三點之間的角度
function calculateAngle(a, b, c) {
  let ab = dist(a.x, a.y, b.x, b.y);
  let bc = dist(b.x, b.y, c.x, c.y);
  let ac = dist(a.x, a.y, c.x, c.y);
  
  // 使用餘弦定理計算角度
  let angle = acos((ab * ab + bc * bc - ac * ac) / (2 * ab * bc));
  return angle * (180 / PI); // 轉換為角度
}

// 檢查是否為 Y-pose
function isYPose(pose) {
  if (!pose || !pose.keypoints) return false;
  
  // 獲取需要的關鍵點
  let leftShoulder = pose.keypoints[5];  // 左肩
  let rightShoulder = pose.keypoints[6]; // 右肩
  let leftElbow = pose.keypoints[7];     // 左肘
  let rightElbow = pose.keypoints[8];    // 右肘
  let leftHip = pose.keypoints[11];      // 左臀
  let rightHip = pose.keypoints[12];     // 右臀
  
  // 檢查關鍵點是否存在且置信度足夠
  if (!leftShoulder || !rightShoulder || !leftElbow || !rightElbow || 
      !leftHip || !rightHip) return false;
  
  if (leftShoulder.confidence < 0.5 || rightShoulder.confidence < 0.5 ||
      leftElbow.confidence < 0.5 || rightElbow.confidence < 0.5 ||
      leftHip.confidence < 0.5 || rightHip.confidence < 0.5) return false;
  
  // 計算肩膀和臀部的中心點
  let shoulderCenter = {
    x: (leftShoulder.x + rightShoulder.x) / 2,
    y: (leftShoulder.y + rightShoulder.y) / 2
  };
  
  let hipCenter = {
    x: (leftHip.x + rightHip.x) / 2,
    y: (leftHip.y + rightHip.y) / 2
  };
  
  // 計算身體中心線向量
  let bodyCenterVector = {
    x: hipCenter.x - shoulderCenter.x,
    y: hipCenter.y - shoulderCenter.y
  };
  
  // 計算左臂向量
  let leftArmVector = {
    x: leftElbow.x - leftShoulder.x,
    y: leftElbow.y - leftShoulder.y
  };
  
  // 計算右臂向量
  let rightArmVector = {
    x: rightElbow.x - rightShoulder.x,
    y: rightElbow.y - rightShoulder.y
  };
  
  // 計算左臂與身體中心線的夾角
  let leftArmAngle = calculateAngle(
    {x: leftShoulder.x + bodyCenterVector.x, y: leftShoulder.y + bodyCenterVector.y},
    leftShoulder,
    leftElbow
  );
  
  // 計算右臂與身體中心線的夾角
  let rightArmAngle = calculateAngle(
    {x: rightShoulder.x + bodyCenterVector.x, y: rightShoulder.y + bodyCenterVector.y},
    rightShoulder,
    rightElbow
  );
  
  // 如果兩臂角度都大於90度，則認為是Y-pose
  return leftArmAngle > 90 && rightArmAngle > 90;
}

// Callback function for when bodyPose outputs data
function gotPoses(results) {
  poses = results;
  if (poses.length > 0) {
    // 檢查是否為 Y-pose
    if (isYPose(poses[0])) {
      if (!isHoldingYPose) {
        // 開始計時
        isHoldingYPose = true;
        yPoseStartTime = millis();
        console.log("Y pose detected!");
      } else if (millis() - yPoseStartTime > YPOSE_HOLD_DURATION) {
        // 如果保持 Y-pose 超過 2 秒，開始錄製
        startRecording();
      }
    } else {
      // 如果不是 Y-pose，重置計時
      isHoldingYPose = false;
    }
  }
}

// 修改開始錄製的函數
function startRecording() {
  waitingToStart = false;
  isCountingDown = true;
  isHoldingYPose = false; // 重置 Y-pose 狀態
  startTime = millis();
  // 每次開始錄製時產生新的隨機色相
  currentHue = random(360);
}

// 新增下載函數
function downloadRecording() {
  // Get the current emotion index
  const emotionIndex = emotions.indexOf(currentEmotion);
  
  // Get or initialize the counter for this emotion
  const counterKey = `emotion_${emotionIndex}_counter`;
  let fileNumber = parseInt(localStorage.getItem(counterKey)) || 1;
  
  // Create the file number with leading zeros
  const paddedNumber = String(emotionIndex * 1000 + fileNumber).padStart(4, '0');
  const filename = `pose-recording-${paddedNumber}.json`;
  
  // Increment the counter for next time
  localStorage.setItem(counterKey, fileNumber + 1);
  
  // Create the data object to save
  let dataToSave = {
    timestamp: new Date().toISOString(),
    duration: RECORDING_DURATION,
    frameRate: 1000/RECORD_INTERVAL,
    emotion: currentEmotion,
    emotionIndex: emotionIndex,
    colors: {
      main: currentHue,
      secondary: (currentHue + 120) % 360,
      tertiary: (currentHue + 240) % 360,
      accent1: (currentHue + 30) % 360,
      accent2: (currentHue - 30) % 360
    },
    poses: recordedPoses
  };
  
  // Convert to JSON string
  let jsonString = JSON.stringify(dataToSave, null, 2);
  
  // Create Blob
  let blob = new Blob([jsonString], { type: 'application/json' });
  
  // Create download link
  let url = URL.createObjectURL(blob);
  let link = document.createElement('a');
  link.download = filename;
  link.href = url;
  link.click();
  
  // Clean up URL object
  URL.revokeObjectURL(url);
}

// 修改重置函數
function resetAll() {
  showingPrompt = true;
  waitingToStart = false;
  isCountingDown = false;
  isDetecting = false;
  isReplaying = false;
  isHoldingYPose = false; // 重置 Y-pose 狀態
  poses = [];
  recordedPoses = [];
  startTime = millis();
  
  // 隨機選擇新的情緒
  currentEmotion = random(emotions);
  
  resetButton.hide();
  downloadButton.hide();
  
  // 停止骨架偵測
  bodyPoseDetector.detectStop();
}

// 新增函數：當提示結束時開始檢測骨架
function startPoseDetection() {
  if (waitingToStart) {
    bodyPoseDetector.detectStart(videoStream, gotPoses);
  }
}