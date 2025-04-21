class SkeletonAnimation {
  constructor(jsonPath, lineColor, pointColor, category) {
    this.jsonPath = jsonPath;
    this.poses = [];
    this.currentFrame = 0;
    this.lastFrameTime = 0;
    this.lineColor = lineColor || color(0, 80, 90, 255);
    this.pointColor = pointColor || color(0, 80, 90, 255);
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
  }

  // 添加靜態參數來控制網格尺寸
  static gridConfig = {
    cols: 4,
    rows: 4,
    cellSize: 500, // 參考尺寸，可以調整這個值來改變網格大小
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
    if (now - this.lastFrameTime > 100) { //fps
      this.currentFrame = (this.currentFrame + 1) % this.poses.length;
      this.lastFrameTime = now;
    }
  }

  draw() {
    if (this.poses.length === 0) return;

    let currentPose = this.poses[this.currentFrame];
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
      
      // Scale to fit the cell
      const scaleFactor = Math.min(cellWidth, cellHeight) / cellSize;
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
        color((hue(this.pointColor) + 120) % 360, 80, 90, 255),
        color((hue(this.pointColor) + 240) % 360, 80, 90, 255),
        color((hue(this.pointColor) + 30) % 360, 80, 90, 255),
        color((hue(this.pointColor) - 30) % 360, 80, 90, 255)
      );
      pop();
    }
  }

  drawPoseSet(poseSet, lineColor, pointColor1, pointColor2, pointColor3, pointColor4) {
    for (let pose of poseSet) {
      // 繪製骨架連接線
      for (let connection of this.connections) {
        let pointA = pose.keypoints[connection[0]];
        let pointB = pose.keypoints[connection[1]];
        if (pointA.confidence > 0.1 && pointB.confidence > 0.1) {
          stroke(lineColor);
          strokeWeight(8);
          line(pointA.x, pointA.y, pointB.x, pointB.y);
        }
      }

      // 繪製關鍵點
      for (let keypoint of pose.keypoints) {
        if (keypoint.confidence > 0.1) {
          fill(pointColor1);
          //noFill();
          noStroke();
          //stroke(pointColor1);
          strokeWeight(3);
          circle(keypoint.x, keypoint.y, 10);
          //circle(keypoint.x, keypoint.y, random(4, 30));
        }
      }
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
  1: 'assets/SkeletonData/happy',
  2: 'assets/SkeletonData/angry',
  3: 'assets/SkeletonData/sad',
  4: 'assets/SkeletonData/surprise'
};

// 添加按鈕狀態追蹤
let buttonPressed = 0; // 0表示沒有按鈕被按下，1-4表示對應的按鈕被按下

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
            lineColor,
            pointColor,
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
  background(0);
  colorMode(HSB, 360, 100, 100, 255);
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
  textSize(12);
  textAlign(CENTER, CENTER);
  fill(255, 100);
  noStroke();
  
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = col * (cellWidth + margin) + margin + cellWidth / 2;
      const y = row * (cellHeight + margin) + margin + cellHeight / 2;
      text(`(${col + 1}, ${row + 1})`, x, y - cellHeight / 2 + 15);
    }
  }

  pop();
}

// 繪製情緒按鈕
function drawEmotionButtons() {
  const buttonWidth = 120;
  const buttonHeight = 50;
  const margin = 10;
  const rightMargin = 32;
  const startX = width - (buttonWidth + margin) * 4 - rightMargin;
  const startY = margin;

  push();
  textAlign(CENTER, CENTER);
  
  for (let i = 1; i <= 4; i++) {
    const x = startX + (buttonWidth + margin) * (i - 1);
    const y = startY;
    
    // 根據按鈕狀態設置顏色
    let strokeAlpha = 255;
    let fillAlpha = 255;
    
    if (buttonPressed === i) {
      // 按鈕被按下的狀態
      strokeAlpha = 200;
      fillAlpha = 200;
    } else if (currentEmotion === i) {
      // 當前選中的狀態
      strokeAlpha = 255;
      fillAlpha = 255;
    } else {
      // 普通狀態
      strokeAlpha = 150;
      fillAlpha = 150;
    }
    
    // 繪製按鈕背景（透明）
    noFill();
    stroke(255, strokeAlpha);
    strokeWeight(3);
    rect(x, y, buttonWidth, buttonHeight, 5);
    
    // 繪製按鈕文字
    fill(255, fillAlpha);
    noStroke();
    textSize(18);
    textStyle(BOLD);
    text(`emo${i}`, x + buttonWidth/2, y + buttonHeight/2);
  }
  
  pop();
}

function mousePressed() {
  const buttonWidth = 120;
  const buttonHeight = 50;
  const margin = 10;
  const rightMargin = 32;
  const startX = width - (buttonWidth + margin) * 4 - rightMargin;
  const startY = margin;

  // 檢查是否點擊了情緒按鈕
  for (let i = 1; i <= 4; i++) {
    const x = startX + (buttonWidth + margin) * (i - 1);
    const y = startY;
    
    if (mouseX >= x && mouseX <= x + buttonWidth &&
        mouseY >= y && mouseY <= y + buttonHeight) {
      buttonPressed = i; // 設置按鈕被按下的狀態
      return;
    }
  }
}

function mouseReleased() {
  if (buttonPressed > 0) {
    currentEmotion = buttonPressed;
    reloadAnimations();
  }
  buttonPressed = 0; // 重置按鈕狀態
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
          lineColor,
          pointColor,
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