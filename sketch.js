// --- MIXING BOARD & CONFIGURATION ---
let ambient;
let masterBGVolume = 1.0;     
let masterMergeVolume = 0.15; 
let maxWordLength = 30;       
let isStarted = false;

let fishTank = [];
let sedimentLayer = [];
let reefColors = [];
let lastReset = 0;
let baseDecayRate = 0.05;
let minFish; 

let colorShallow, colorDeep, colorAbyss;
let sedimentTeal;
let globalScale = 1;

// TIMING (17:00 Cycle)
let singularityTime = 950000;   
let leviathanSpawn = 955000;    
let cataclysmTime = 980000;     
let leviathanExitTime = 1000000; 
let voidEndTime = 1010000;      
let resetTime = 1020000;        

// STORAGE
let fragments = ["", "", "", ""]; 
let ghosts = ["", ""];    
let milestoneFlags = [false, false, false, false, false, false];

let joycePool = [], mobyPool = [], thunderPool = [], whalePool = [];
let voyagerAudio, mergeSFX; 
let leviathanActive = false;

function preload() {
  // Corrected paths for same-folder assets directory
  loadTable('./assets/FW_Wordfish_Pool.csv', 'csv', (t) => { joycePool = t.getColumn(0); });
  loadTable('./assets/Mobywords.csv', 'csv', (t) => { mobyPool = t.getColumn(0); });
  loadTable('./assets/thunderwords.csv', 'csv', (t) => { thunderPool = t.getColumn(0); });
  loadTable('./assets/whale.csv', 'csv', (t) => { whalePool = t.getColumn(0); });
  mergeSFX = loadSound('./assets/merge.wav');
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  // Audio setup for the ambient file
  ambient = createAudio('./assets/ambient.mp3'); 
  ambient.hide(); 
  
  calculateResponsiveScale();
  mergeSFX.setVolume(masterMergeVolume); 

  colorMode(RGB); 
  colorShallow = color(0, 160, 210); 
  colorDeep = color(5, 15, 35);      
  colorAbyss = color(0, 0, 0);       
  sedimentTeal = color(80, 180, 180);
  reefColors = [color(0, 255, 200), color(255, 100, 150), color(255, 255, 100), color(150, 100, 255), color(0, 200, 255)];
  textFont('Georgia');
}

function calculateResponsiveScale() {
  globalScale = map(height, 400, 1080, 0.55, 1.0, true);
  let area = width * height;
  minFish = floor(area / 70000);
  minFish = constrain(minFish, 6, 16); 
}

function draw() {
  let now = millis();
  let elapsed = now - lastReset;
  let currentBG = handleBackground(elapsed);
  background(currentBG);

  if (!isStarted) {
    fill(255); textAlign(CENTER, CENTER); 
    textFont('Georgia'); textSize(54 * globalScale);
    text("Moby's Wake", width/2, height/2 - 60);
    textSize(24 * globalScale);
    text("Click To Begin Dream", width/2, height/2 + 20);
    return;
  }

  if (elapsed > resetTime) { resetCycle(); return; }

  handleTieredEvents(elapsed);

  // Spawning logic
  let activeSwimmers = fishTank.filter(f => !f.isSet && !f.isFalling && f.sizeType !== "Leviathan" && f.sizeType !== "Largeclass");
  if (activeSwimmers.length < minFish && elapsed < singularityTime && frameCount % 30 === 0 && joycePool.length > 0) {
    fishTank.push(new Wordfish(random(100, width-200), random(height * 0.75, height - 100)));
  }

  for (let f of fishTank) {
    if (f.sizeType === "Largeclass" || f.sizeType === "Leviathan") {
      f.update(sedimentLayer, height, width, elapsed, currentBG);
      f.display(currentBG);
    }
  }

  for (let i = sedimentLayer.length - 1; i >= 0; i--) {
    sedimentLayer[i].update(sedimentLayer, height, width, elapsed, currentBG);
    sedimentLayer[i].display(currentBG);
    if (sedimentLayer[i].alpha <= 0) sedimentLayer.splice(i, 1);
  }

  handleEcosystem(elapsed, currentBG);
}

function handleTieredEvents(elapsed) {
  let pacingSpeed = 1.2 * globalScale;
  let intervals = [120000, 240000, 360000, 480000];
  
  for (let i = 0; i < intervals.length; i++) {
    if (elapsed > intervals[i] && !milestoneFlags[i] && thunderPool.length > 0) {
      let pool = (i % 2 === 0) ? thunderPool : whalePool; 
      let str = generateString(pool, 25);
      fragments[i] = str;
      
      let startX = (i % 2 === 0) ? 60 : width - 500;
      let f = new Wordfish(startX, height * (0.2 + i * 0.15), "Largeclass", str);
      f.isPacing = true;
      f.vel.x = (i % 2 === 0) ? pacingSpeed : -pacingSpeed;
      fishTank.push(f);
      milestoneFlags[i] = true;
    }
  }

  if (elapsed > 765000 && !milestoneFlags[4]) {
    fishTank = fishTank.filter(f => !f.isPacing); 
    ghosts[0] = braidStrings(fragments[0], fragments[2], 5); 
    ghosts[1] = braidStrings(fragments[1], fragments[3], 5); 
    spawnGlider(ghosts[0], "Largeclass", width + 100, height * 0.48, 40000, false);
    spawnGlider(ghosts[1], "Largeclass", -1500, height * 0.52, 40000, true);
    milestoneFlags[4] = true;
  }

  if (elapsed > leviathanSpawn && !leviathanActive && ghosts[0] !== "") {
    let finalStr = braidStrings(ghosts[0], ghosts[1], 10);
    spawnGlider(finalStr.substring(0, 101), "Leviathan", width + 500, height/2, 45000, false);
    leviathanActive = true;
  }
}

function generateString(pool, len) {
  let str = "";
  while(str.length < len) { str += random(pool); }
  return str.substring(0, len).toUpperCase();
}

function braidStrings(s1, s2, biteSize) {
  let result = "";
  for (let i = 0; i < 5; i++) {
    result += s1.substring(i * biteSize, (i + 1) * biteSize);
    result += s2.substring(i * biteSize, (i + 1) * biteSize);
  }
  return result;
}

function spawnGlider(txt, type, startX, startY, durationMs, moveRight = false) {
  let fish = new Wordfish(startX, startY, type, txt);
  textSize(fish.font_size * globalScale);
  let totalDist = width + textWidth(txt) + 1200;
  let frames = (durationMs / 1000) * 60;
  fish.vel.x = (moveRight ? 1 : -1) * (totalDist / frames);
  fishTank.push(fish);
}

function handleBackground(elapsed) {
  if (elapsed < singularityTime) return lerpColor(colorShallow, colorDeep, map(elapsed, 0, singularityTime, 0, 1));
  if (elapsed < leviathanExitTime) return lerpColor(colorDeep, colorAbyss, map(elapsed, singularityTime, leviathanExitTime, 0, 1));
  if (elapsed < voidEndTime) return colorAbyss;
  return lerpColor(colorAbyss, colorShallow, map(elapsed, voidEndTime, resetTime, 0, 1));
}

function resetCycle() {
  fishTank = []; sedimentLayer = []; lastReset = millis();
  leviathanActive = false; milestoneFlags = [false, false, false, false, false, false];
}

function handleEcosystem(elapsed, bg) {
  let toRemove = new Set();
  let newSpawn = [];
  let isSingularity = elapsed > singularityTime;
  let isCataclysm = elapsed > cataclysmTime;

  for (let i = 0; i < fishTank.length; i++) {
    let a = fishTank[i];
    if (a.sizeType === "Largeclass" || a.sizeType === "Leviathan" || toRemove.has(i) || a.isSet) continue;

    if (a.pos.y < 50 && !isSingularity && !a.isFalling) {
      toRemove.add(i);
      breakText(a.text).forEach(c => { 
        newSpawn.push(new Wordfish(a.pos.x, a.pos.y + 10, "Small", c, true)); 
      });
      continue;
    }

    for (let j = i + 1; j < fishTank.length; j++) {
      let b = fishTank[j];
      if (b.sizeType === "Largeclass" || b.sizeType === "Leviathan" || toRemove.has(j) || b.isSet || b.isFalling) continue;
      
      if (a.intersects(b)) {
        if (a.text.length + b.text.length <= maxWordLength) {
          if (mergeSFX.isLoaded()) mergeSFX.play();
          newSpawn.push(new Wordfish((a.pos.x+b.pos.x)/2, (a.pos.y+b.pos.y)/2, "Medium", a.text + b.text.toLowerCase()));
          toRemove.add(i); toRemove.add(j); break;
        } else {
          a.vel.x *= -1; b.vel.x *= -1; 
        }
      }
    }
  }

  for (let i = fishTank.length - 1; i >= 0; i--) {
    if (toRemove.has(i)) { fishTank.splice(i, 1); continue; }
    let f = fishTank[i];
    if (f.sizeType === "Largeclass" || f.sizeType === "Leviathan") continue; 
    f.update(sedimentLayer, height, width, elapsed, bg);
    if (f.isSet && !isCataclysm) { sedimentLayer.push(f); fishTank.splice(i, 1); }
    else f.display(bg);
  }
  fishTank.push(...newSpawn);
}

class Wordfish {
  constructor(x, y, sizeType = "Small", text = null, isFalling = false) {
    this.sizeType = sizeType;
    this.isFalling = isFalling;
    this.isPacing = false;
    this.birthTime = millis();

    if (text) {
      this.text = text;
    } else {
      let j = (joycePool.length > 0) ? random(joycePool) : "river";
      let m = (mobyPool.length > 0) ? random(mobyPool) : "whale";
      this.text = j.substring(0, 5) + m.substring(0, 5).toLowerCase();
    }

    this.pos = createVector(x, y);
    this.alpha = 255;
    this.isSet = false;

    // Font size assignment before width measurement
    if (sizeType === "Leviathan") { 
      this.font_size = 180; this.baseColor = color(110, 125, 140); this.vel = createVector(0,0);
    } else if (sizeType === "Largeclass") { 
      this.font_size = (this.text.length > 30 ? 70 : 45); this.baseColor = color(120, 140, 160); this.alpha = 85; this.vel = createVector(0,0);
    } else if (isFalling) { 
      this.font_size = 26; this.baseColor = color(255); this.vel = createVector(random(-0.3, 0.3), 1.2);
    } else { 
      this.font_size = (this.text.length > 40 ? 48 : 26); this.baseColor = random(reefColors); 
      this.vel = createVector(random(-1.4, 1.4), -random(0.2, 0.6));
    }

    textSize(this.font_size * globalScale);
    this.w = textWidth(this.text);
  }

  update(sediment, h, w, elapsed, bg) {
    let isCataclysm = elapsed > cataclysmTime;
    let isSingularity = elapsed > singularityTime;
    let age = millis() - this.birthTime;

    if (this.isSet && !isCataclysm) { 
      this.alpha -= baseDecayRate * map(this.pos.y, h, 0, 1, 6); 
      return; 
    }

    this.pos.add(this.vel);

    // Hard-propel logic to prevent vibrational trapping
    if (this.isPacing) {
      if (this.pos.x < 50) { 
        this.vel.x = Math.abs(this.vel.x); 
        this.pos.x = 51; 
      } else if (this.pos.x > w - this.w - 50) { 
        this.vel.x = -Math.abs(this.vel.x); 
        this.pos.x = w - this.w - 51; 
      }
      return; 
    }

    if (this.sizeType !== "Largeclass" && this.sizeType !== "Leviathan") {
      if (!this.isFalling && !isSingularity) {
        if (this.pos.x < 15) { this.vel.x = Math.abs(this.vel.x); this.pos.x = 16; }
        if (this.pos.x > w - this.w - 15) { this.vel.x = -Math.abs(this.vel.x); this.pos.x = w - this.w - 16; }
        if (this.pos.y > h - 60) { this.vel.y *= -1; this.pos.y = h - 61; }
      }
      
      if (isSingularity && !isCataclysm) {
        this.vel.mult(0.97); 
        this.vel.add(p5.Vector.sub(createVector(w/2, h * 0.8), this.pos).normalize().mult(0.15));
        this.baseColor = lerpColor(color(this.baseColor), sedimentTeal, 0.05);
      }
      
      if (isCataclysm) { 
        this.isFalling = true; this.baseColor = color(255); this.isSet = false; 
        this.vel = createVector(0, 14); this.alpha -= 6; 
      }
      
      if (!isCataclysm && age > 1500) {
        let floorLine = h - (60 * globalScale);
        if (this.pos.y > floorLine) { this.pos.y = floorLine; this.isSet = true; }
        else {
          for (let s of sediment) {
            if (s.alpha > 100 && dist(this.pos.x, this.pos.y, s.pos.x, s.pos.y) < (25 * globalScale)) { this.isSet = true; break; }
          }
        }
      }
    }
  }

  display(bg) {
    push();
    let c = this.isSet ? color(80, 180, 180) : color(this.baseColor);
    
    if (this.sizeType === "Largeclass") {
      c = lerpColor(c, bg, 0.4); c.setAlpha(this.alpha);
    } else if (!this.isSet && this.sizeType !== "Leviathan" && !this.isFalling) {
      c = lerpColor(c, colorDeep, map(this.text.length, 10, 30, 0, 0.7));
      c.setAlpha(this.alpha);
      drawingContext.shadowBlur = 10 * globalScale; 
      drawingContext.shadowColor = c;
    } else { c.setAlpha(this.alpha); }

    fill(c); noStroke(); textAlign(LEFT, CENTER);

    if (this.sizeType === "Leviathan") {
      let currentX = this.pos.x; 
      let baseS = 60 * globalScale;
      let swellS = 140 * globalScale;
      for (let i = 0; i < this.text.length; i++) {
        let angle = map(i, 0, this.text.length - 1, 0, PI);
        let s = baseS + (sin(angle) * swellS);
        textSize(s); text(this.text[i], currentX, this.pos.y);
        currentX += textWidth(this.text[i]);
      }
    } else {
      textSize(this.font_size * globalScale);
      text(this.text, this.pos.x, this.pos.y);
    }
    pop();
  }

  intersects(other) {
    let myCenterX = this.pos.x + this.w/2;
    let theirCenterX = other.pos.x + other.w/2;
    return dist(myCenterX, this.pos.y, theirCenterX, other.pos.y) < ((this.w + other.w) * 0.45);
  }
}

function breakText(txt) {
  let chunks = []; let i = 0;
  while (i < txt.length) {
    let step = floor(random(1, 4));
    chunks.push(txt.substring(i, i + step));
    i += step;
  }
  return chunks;
}

function mousePressed() {
  if (!isStarted) {
    userStartAudio(); 
    isStarted = true; 
    lastReset = millis();
    ambient.loop(); 
  }
}  

function windowResized() { 
  resizeCanvas(windowWidth, windowHeight); 
  calculateResponsiveScale(); 
}
