class SkeletonAnimation {
  constructor(jsonPath, lineColor, pointColor, category) {
    this.jsonPath = jsonPath;
    this.poses = [];
    this.currentFrame = 0;
    this.lastFrameTime = 0;
    const palette = [
      color(255, 236, 224), // Beige
      color(0, 55, 123),   // Primary Blue
      color(225, 55, 40),   // Bright Red
      color(255, 190, 0), // Golden Yellow
      color(190, 217, 239),  // Soft Sky Blue
      color(100, 174, 207) // Light Gray Blue
    ];
    // Pick two different random colors for line and point
    let idx1 = floor(random(palette.length));
    let idx2;
    do {
      idx2 = floor(random(palette.length));
    } while (idx2 === idx1);
    this.lineColor = lineColor || palette[idx1];
    this.pointColor = pointColor || palette[idx2];
    this.category = category; // 0-4 for different categories
    this.connections = [
      // 臉部連接
      [0, 1], [1, 2], [2, 3], [3, 7], [0, 4], [4, 5], [5, 6], [6, 8],
      // 身體連接
      [9, 10], [11, 12], [11, 13], [13, 15], [15, 17], [15, 19], [15, 21],
      [17, 19], [12, 14], [14, 16], [16, 18], [16, 20], [16, 22], [18, 20],
      // 手臂連接
      [11, 23], [12, 24], [23, 24], [23, 25], [24, 26], [25, 27], [26, 28],
      [27, 29], [28, 30], [29, 31], [30, 32], [27, 31], [28, 32]
    ];
    this.smoothedKeypoints = null;
    this.keypointSizes = Array(33).fill(0).map((_, i) => {
      return i <= 10 ? 0 : random(50, 80);
    });
    this.connectionCurves = this.connections.map(() => random(-20, 50));
  }

  // 添加靜態參數來控制網格尺寸
  static gridConfig = {
    cols: 4,
    rows: 4,
    cellSize: 400, // Reduced from 500
    margin: 20     // 網格之間的間距
  };

  load() {
    loadJSON(this.jsonPath, (data) => {
      this.poses = data.poses;
      console.log('Loaded poses:', this.poses.length);
    });
  }

  update() {
    if (this.poses.length === 0) return;

    let now = millis();
    if (now - this.lastFrameTime > 150) { //fps
      this.currentFrame = (this.currentFrame + 1) % this.poses.length;
      this.lastFrameTime = now;
    }

    // 取得當前幀的 keypoints
    let currentKeypoints = this.poses[this.currentFrame].keypoints;

    if (!this.smoothedKeypoints) {
      this.smoothedKeypoints = currentKeypoints.map(kp => ({...kp}));
    } else {
      // 用 lerp 平滑每個 keypoint
      for (let i = 0; i < currentKeypoints.length; i++) {
        this.smoothedKeypoints[i].x = lerp(this.smoothedKeypoints[i].x, currentKeypoints[i].x, 0.3);
        this.smoothedKeypoints[i].y = lerp(this.smoothedKeypoints[i].y, currentKeypoints[i].y, 0.3);
        this.smoothedKeypoints[i].confidence = currentKeypoints[i].confidence; // 這個可以直接用
      }
    }
  }

  draw() {
    if (this.poses.length === 0) return;

    let currentPose = { keypoints: this.smoothedKeypoints || this.poses[this.currentFrame].keypoints };
    if (currentPose) {
      push();
      
      // 使用靜態參數計算網格位置
      const { cols, rows, cellSize, margin } = SkeletonAnimation.gridConfig;
      const cellWidth = (width - (cols + 1) * margin) / cols;
      const cellHeight = (height - (rows + 1) * margin) / rows;
      
      // Calculate position based on category (1-16)
      const row = Math.floor((this.category - 1) / cols);
      const col = (this.category - 1) % cols;
      
      // Calculate center of the cell with margin
      const x = col * (cellWidth + margin) + margin + cellWidth / 2;
      const y = row * (cellHeight + margin) + margin + cellHeight / 2;
      
      // Apply translation
      translate(x, y);
      
      // Scale to fit the cell with a safety margin
      const scaleFactor = Math.min(cellWidth, cellHeight) / cellSize * 0.35;
      scale(scaleFactor);

      // 計算骨架的中心點
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (let keypoint of currentPose.keypoints) {
        if (keypoint.confidence > 0.1) {
          minX = Math.min(minX, keypoint.x);
          maxX = Math.max(maxX, keypoint.x);
          minY = Math.min(minY, keypoint.y);
          maxY = Math.max(maxY, keypoint.y);
        }
      }
      
      // 計算骨架的寬度和高度
      const skeletonWidth = maxX - minX;
      const skeletonHeight = maxY - minY;
      
      // 計算骨架的中心點
      const skeletonCenterX = (minX + maxX) / 2;
      const skeletonCenterY = (minY + maxY) / 2;
      
      // 將骨架中心點移到網格中心
      translate(-skeletonCenterX, -skeletonCenterY);
      
      this.drawPoseSet(
        [{ keypoints: currentPose.keypoints }],
        this.lineColor,
        this.pointColor,
        // color((hue(this.pointColor) + 120) % 360, 80, 90, 255),
        // color((hue(this.pointColor) + 240) % 360, 80, 90, 255),
        // color((hue(this.pointColor) + 30) % 360, 80, 90, 255),
        // color((hue(this.pointColor) - 30) % 360, 80, 90, 255)
      );
      pop();
    }
  }

  drawPoseSet(poseSet, lineColor, pointColor1, pointColor2, pointColor3, pointColor4) {
    for (let pose of poseSet) {
      // 繪製骨架連接線
      this.connections.forEach((connection, i) => {
        let pointA = pose.keypoints[connection[0]];
        let pointB = pose.keypoints[connection[1]];
        if (pointA.confidence > 0.1 && pointB.confidence > 0.1) {
          stroke(lineColor);
          strokeWeight(30);
          // 用固定曲度
          let curveOffset = this.connectionCurves[i];
          let cx = (pointA.x + pointB.x) / 2 + curveOffset;
          let cy = (pointA.y + pointB.y) / 2 + curveOffset;
          noFill();
          beginShape();
          vertex(pointA.x, pointA.y);
          quadraticVertex(cx, cy, pointB.x, pointB.y);
          endShape();
        }
      });

      // 繪製關鍵點
      pose.keypoints.forEach((keypoint, i) => {
        if (keypoint.confidence > 0.1) {
          let pointColorWithAlpha = color(red(pointColor1), green(pointColor1), blue(pointColor1), 210);
          fill(pointColorWithAlpha);
          noStroke();
          circle(keypoint.x, keypoint.y, this.keypointSizes[i]);
        }
      });
    }
  }

  setColors(lineColor, pointColor) {
    this.lineColor = lineColor;
    this.pointColor = pointColor;
  }
}

// 創建骨架動畫實例
let skeletonAnimations = [];

// 添加情緒按鈕相關的變數和函數
let currentEmotion = 1; // 當前選擇的情緒
const emotionPaths = {
  1: 'assets/SkeletonData/0',
  2: 'assets/SkeletonData/1',
  3: 'assets/SkeletonData/2',
  4: 'assets/SkeletonData/3',
  5: 'assets/SkeletonData/4',
};

// 添加按鈕狀態追蹤
let buttonPressed = 0; // 0表示沒有按鈕被按下，1-4表示對應的按鈕被按下
let isMenuOpen = false; // 新增菜單狀態變數
const menuWidth = 200; // 菜單寬度
const menuItemHeight = 50; // 菜單項高度

function preload() {
    // 請求檔案系統存取權限
    const skeletonDataDir = emotionPaths[1];
    
    // use fetch API read foler content
    fetch(skeletonDataDir)
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to access directory');
        }
        return response.text();
      })
      .then(html => {
        // parse HTML to get file list
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const links = doc.querySelectorAll('a');
        const files = Array.from(links)
          .map(link => link.href.split('/').pop())
          .filter(file => file.endsWith('.json'))
          .slice(0, 16); // 只取前16個檔案
        
        console.log('Found JSON files:', files);
        
        // Process each JSON file
        files.forEach((file, index) => {
          // Calculate grid position (4x4 grid)
          const category = index + 1; // 1-16
          
          // Use different colors for different animations
          let hue = (index * 22.5) % 360; // 360/16 = 22.5 degrees per color
          let lineColor = color(hue, 80, 190, 255);
          let pointColor = color((hue + 120) % 360, 180, 90, 255);
          
          // Create the full path
          const fullPath = `${skeletonDataDir}/${file}`;
          console.log(`Loading animation ${index + 1}: ${fullPath} (Category: ${category})`);
  
          skeletonAnimations.push(new SkeletonAnimation(
            fullPath,
            undefined,
            undefined,
            category
          ));
        });
  
        // Load all animations
        for (let animation of skeletonAnimations) {
          animation.load();
        }
      })
      .catch(error => {
        console.error('Error accessing directory:', error);
      });
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  background(241, 222, 211);
  colorMode(RGB, 255, 255, 255, 255);
}

function draw() {
  background(0);

  // 繪製網格邊界
  drawGridBoundaries();

  // 更新並繪製所有骨架動畫
  for (let animation of skeletonAnimations) {
    animation.update();
    animation.draw();
  }

  // 繪製情緒按鈕
  drawEmotionButtons();
}

// 繪製網格邊界
function drawGridBoundaries() {
  const { cols, rows, margin } = SkeletonAnimation.gridConfig;
  const cellWidth = (width - (cols + 1) * margin) / cols;
  const cellHeight = (height - (rows + 1) * margin) / rows;

  push();
  stroke(255, 50); // 半透明的白色
  strokeWeight(1);
  noFill();

  // 繪製每個單元格的邊界
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = col * (cellWidth + margin) + margin;
      const y = row * (cellHeight + margin) + margin;
      rect(x, y, cellWidth, cellHeight);
    }
  }

  // 繪製網格標籤
  // textSize(12);
  // textAlign(CENTER, CENTER);
  // fill(255, 100);
  // noStroke();
  
  // for (let row = 0; row < rows; row++) {
  //   for (let col = 0; col < cols; col++) {
  //     const x = col * (cellWidth + margin) + margin + cellWidth / 2;
  //     const y = row * (cellHeight + margin) + margin + cellHeight / 2;
  //     text(`(${col + 1}, ${row + 1})`, x, y - cellHeight / 2 + 15);
  //   }
  // }

  pop();
}

// 繪製情緒按鈕
function drawEmotionButtons() {
  const buttonSize = 40;
  const margin = 20;
  const x = width - buttonSize - margin;
  const y = margin;

  // 繪製漢堡菜單按鈕
  push();
  noFill();
  stroke(255, isMenuOpen ? 200 : 150);
  strokeWeight(3);
  rect(x, y, buttonSize, buttonSize, 25);
  
  // 繪製漢堡圖標線條
  stroke(255, isMenuOpen ? 200 : 150);
  strokeWeight(2);
  const lineSpacing = buttonSize / 4;
  for (let i = 0; i < 3; i++) {
    const lineY = y + lineSpacing * (i + 1);
    line(x + 10, lineY, x + buttonSize - 10, lineY);
  }
  pop();

  // 如果菜單打開，繪製下拉選項
  if (isMenuOpen) {
    const emotionTexts = [
      "I'm so happy",
      "I love you",
      "I'm so frustrated",
      "I'm feeling sorrow",
      "I'm so excited"
    ];

    push();
    // 繪製菜單背景
    fill(0, 200);
    stroke(255, 150);
    strokeWeight(2);
    rect(x - menuWidth + buttonSize, y + buttonSize, menuWidth, emotionTexts.length * menuItemHeight, 5);

    // 繪製菜單項
    textAlign(LEFT, CENTER);
    textSize(16);
    for (let i = 0; i < emotionTexts.length; i++) {
      const itemY = y + buttonSize + menuItemHeight * i + menuItemHeight/2;
      
      // 高亮當前選中的情緒
      if (currentEmotion === i + 1) {
        fill(255, 50);
        noStroke();
        rect(x - menuWidth + buttonSize, y + buttonSize + menuItemHeight * i, menuWidth, menuItemHeight);
      }
      
      // 繪製文字
      fill(255, currentEmotion === i + 1 ? 255 : 150);
      noStroke();
      text(emotionTexts[i], x - menuWidth + buttonSize + 10, itemY);
    }
    pop();
  }
}

function mousePressed() {
  const buttonSize = 40;
  const margin = 20;
  const x = width - buttonSize - margin;
  const y = margin;

  // 檢查是否點擊了漢堡菜單按鈕
  if (mouseX >= x && mouseX <= x + buttonSize &&
      mouseY >= y && mouseY <= y + buttonSize) {
    isMenuOpen = !isMenuOpen;
    return;
  }

  // 如果菜單打開，檢查是否點擊了菜單項
  if (isMenuOpen) {
    const emotionTexts = [
      "I'm so happy",
      "I love you",
      "I'm so frustrated",
      "I'm feeling sorrow",
      "I'm so excited"
    ];

    for (let i = 0; i < emotionTexts.length; i++) {
      const itemY = y + buttonSize + menuItemHeight * i;
      if (mouseX >= x - menuWidth + buttonSize && mouseX <= x + buttonSize &&
          mouseY >= itemY && mouseY <= itemY + menuItemHeight) {
        currentEmotion = i + 1;
        isMenuOpen = false;
        reloadAnimations();
        return;
      }
    }
  }
}

function mouseReleased() {
  buttonPressed = 0;
}

// 重新載入動畫
function reloadAnimations() {
  skeletonAnimations = [];
  const skeletonDataDir = emotionPaths[currentEmotion];
  
  fetch(skeletonDataDir)
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to access directory');
      }
      return response.text();
    })
    .then(html => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const links = doc.querySelectorAll('a');
      const files = Array.from(links)
        .map(link => link.href.split('/').pop())
        .filter(file => file.endsWith('.json'))
        .slice(0, 16);
      
      console.log('Found JSON files:', files);
      
      files.forEach((file, index) => {
        const category = index + 1;
        let hue = (index * 22.5) % 360; // 360/16 = 22.5 degrees per color
        let lineColor = color(hue, 80, 190, 255);
        let pointColor = color((hue + 120) % 360, 180, 90, 255);
        
        const fullPath = `${skeletonDataDir}/${file}`;
        console.log(`Loading animation ${index + 1}: ${fullPath} (Category: ${category})`);

        skeletonAnimations.push(new SkeletonAnimation(
          fullPath,
          undefined,
          undefined,
          category
        ));
      });

      for (let animation of skeletonAnimations) {
        animation.load();
      }
    })
    .catch(error => {
      console.error('Error accessing directory:', error);
    });
}

// 添加新的骨架動畫
function addNewSkeletonAnimation(jsonPath, lineColor, pointColor) {
  let newAnimation = new SkeletonAnimation(jsonPath, lineColor, pointColor);
  newAnimation.load();
  skeletonAnimations.push(newAnimation);
  return newAnimation;
}