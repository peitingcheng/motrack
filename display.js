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
      
            // // Apply translation based on category
            // switch(this.category) {
            //   case 1: // Top left
            //     translate(width * 0.3, height * 0.01);
            //     break;
            //   case 2: // Top center
            //     translate(width * 0.6, height * 0.01);
            //     break;
            //   case 3: // Top right
            //     translate(width * 0.9, height * 0.01);
            //     break;
            //   case 4: // Bottom left
            //     translate(width * 0.3, height * 0.5);
            //     break;
            //   case 5: // Bottom center
            //     translate(width * 0.6, height * 0.5);
            //     break;
            // }

      // Calculate grid position based on category
      const gridSize = 250;
      const margin = 60;
      const cols = Math.floor(width / (gridSize + margin));
      const row = Math.floor((this.category - 1) / cols);
      const col = (this.category - 1) % cols;
      
      // Calculate position
      const x = col * (gridSize + margin) + margin;
      const y = row * (gridSize + margin) + margin;
      
      // Apply translation
      translate(x, y);
      
      // Scale to fit 250x250 box
      scale(0.5);
      
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
          strokeWeight(2);
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

function preload() {
    // 請求檔案系統存取權限
    const skeletonDataDir = 'assets/SkeletonData';
    
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
          .filter(file => file.endsWith('.json'));
        
        console.log('Found JSON files:', files);
        
        // Process each JSON file
        files.forEach((file, index) => {
          // Determine category based on filename
          let category = 0;
          if (file.startsWith('pose-recording-0')) {
            category = 1;
          } else if (file.startsWith('pose-recording-1')) {
            category = 2;
          } else if (file.startsWith('pose-recording-2')) {
            category = 3;
          } else if (file.startsWith('pose-recording-3')) {
            category = 4;
          } else if (file.startsWith('pose-recording-4')) {
            category = 5;
          }
          
          // Use different colors for different animations
          let hue = (index * 60) % 360; // 60 degrees per color
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

  // 更新並繪製所有骨架動畫
  for (let animation of skeletonAnimations) {
    animation.update();
    animation.draw();
  }
}

// 添加新的骨架動畫
function addNewSkeletonAnimation(jsonPath, lineColor, pointColor) {
  let newAnimation = new SkeletonAnimation(jsonPath, lineColor, pointColor);
  newAnimation.load();
  skeletonAnimations.push(newAnimation);
  return newAnimation;
}
