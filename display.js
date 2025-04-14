class SkeletonAnimation {
  constructor(jsonPath, lineColor, pointColor) {
    this.jsonPath = jsonPath;
    this.poses = [];
    this.currentFrame = 0;
    this.lastFrameTime = 0;
    this.lineColor = lineColor || color(0, 80, 90, 255);
    this.pointColor = pointColor || color(0, 80, 90, 255);
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
    if (now - this.lastFrameTime > 70) { // 約30fps
      this.currentFrame = (this.currentFrame + 1) % this.poses.length;
      this.lastFrameTime = now;
    }
  }

  draw() {
    if (this.poses.length === 0) return;

    let currentPose = this.poses[this.currentFrame];
    if (currentPose) {
      push();
      translate(width, 0);
      scale(-1, 1);
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
          strokeWeight(10);
          line(pointA.x, pointA.y, pointB.x, pointB.y);
        }
      }

      // 繪製關鍵點
      for (let keypoint of pose.keypoints) {
        if (keypoint.confidence > 0.1) {
          fill(pointColor1);
          noStroke();
          circle(keypoint.x, keypoint.y, 8);
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
  // Define the list of JSON files
  const jsonFiles = [
    'pose-recording-0001.json',
    'pose-recording-0002.json',
    'pose-recording-0003.json',
    'pose-recording-0004.json',
    'pose-recording-2001.json',
    'pose-recording-4001.json'
  ];
  
  // Process each JSON file
  jsonFiles.forEach((file, index) => {
    // Use different colors for different animations
    let hue = (index * 60) % 360; // 60 degrees per color
    let lineColor = color(hue, 80, 190, 255);
    let pointColor = color((hue + 120) % 360, 180, 90, 255);
    
    // Create the full path
    const fullPath = `assets/SkeletonData/${file}`;
    console.log(`Loading animation ${index + 1}: ${fullPath}`);

    skeletonAnimations.push(new SkeletonAnimation(
      fullPath,
      lineColor,
      pointColor
    ));
  });

  // Load all animations
  for (let animation of skeletonAnimations) {
    animation.load();
  }
}

function setup() {
  createCanvas(640, 480);
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
