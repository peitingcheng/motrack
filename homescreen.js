class DynamicText {
  constructor(text, x, y, fontSize) {
    this.text = text;
    this.x = x;
    this.y = y;
    this.fontSize = fontSize;
    this.letters = [];
    this.setupLetters();
  }

  setupLetters() {
    // 計算文字的總寬度
    textFont(myFontBold);
    textSize(this.fontSize);
    let totalWidth = textWidth(this.text);
    
    // 計算起始 x 位置，使文字居中
    let startX = this.x - totalWidth / 2;
    
    // 將文字拆分成單個字母
    for (let i = 0; i < this.text.length; i++) {
      let char = this.text[i];
      let charWidth = textWidth(char);
      
      this.letters.push({
        char: char,
        x: startX + charWidth / 2,
        y: this.y,
        targetY: this.y,
        offsetY: random(-20, 20),
        rotation: random(-5, 5),
        scale: random(0.8, 1.2),
        color: color(255),
        alpha: 0,
        charWidth: charWidth
      });
      
      startX += charWidth;
    }
  }

  update() {
    // 更新每個字母的位置和屬性
    for (let letter of this.letters) {
      // 平滑移動到目標位置
      letter.y = lerp(letter.y, letter.targetY + letter.offsetY, 0.1);
      
      // 隨機旋轉
      letter.rotation = lerp(letter.rotation, random(-2, 2), 0.05);
      
      // 隨機縮放
      letter.scale = lerp(letter.scale, random(0.9, 1.1), 0.05);
      
      // 漸入效果
      letter.alpha = lerp(letter.alpha, 255, 0.1);
    }
  }

  draw() {
    push();
    textAlign(CENTER, CENTER);
    textFont(myFontBold);
    textSize(this.fontSize);
    
    for (let letter of this.letters) {
      push();
      translate(letter.x, letter.y);
      rotate(radians(letter.rotation));
      scale(letter.scale);
      fill(letter.color.levels[0], letter.color.levels[1], letter.color.levels[2], letter.alpha);
      text(letter.char, 0, 0);
      pop();
    }
    
    pop();
  }

  reset() {
    // 重置所有字母的位置和屬性
    for (let letter of this.letters) {
      letter.y = this.y;
      letter.offsetY = random(-20, 20);
      letter.rotation = random(-5, 5);
      letter.scale = random(0.8, 1.2);
      letter.alpha = 0;
    }
  }
}

class ConnectionPoints {
  constructor(numPoints) {
    this.points = [];
    this.numPoints = numPoints;
    this.connectionDistance = 200;
    this.initPoints();
  }

  initPoints() {
    for (let i = 0; i < this.numPoints; i++) {
      this.points.push({
        x: random(width),
        y: random(height),
        vx: random(-1, 1),
        vy: random(-1, 1),
        size: random(80, 200)
      });
    }
  }

  update() {
    for (let point of this.points) {
      // 更新點的位置
      point.x += point.vx;
      point.y += point.vy;

      // 碰到邊界時反彈
      if (point.x < 0 || point.x > width) point.vx *= -1;
      if (point.y < 0 || point.y > height) point.vy *= -1;
    }
  }

  draw() {
    push();
    // 繪製連線
    stroke(25);
    strokeWeight(5);

    // 按順序連接點 (1->2, 2->3, 3->4, ...)
    for (let i = 0; i < this.points.length - 1; i++) {
      let p1 = this.points[i];
      let p2 = this.points[i + 1];
      line(p1.x, p1.y, p2.x, p2.y);
    }

    // 連接最後一個點回到第一個點
    let lastPoint = this.points[this.points.length - 1];
    let firstPoint = this.points[0];
    line(lastPoint.x, lastPoint.y, firstPoint.x, firstPoint.y);

    // 繪製點
    noStroke();
    fill(25);
    for (let point of this.points) {
      circle(point.x, point.y, point.size);
    }
    pop();
  }
}
