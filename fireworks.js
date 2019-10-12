/*
 *
 * Trabalho realizado por:
 * 
 * Sara Trafaria Nº 41693
 * João Peres Nº 48320
 *
 */

var gl;
var canvas;

// HTML Text elements
var autoFireText, timeText;

// BufferVars
var bfLine, bfFirework;

// Program Vars
var programLine, programFirework;

// Boolean flag to control the drawing of the Aim Line
var isAiming = false;

// Auto Firework vars
var autoFirework = false;
const AUTOSTART_YAXIS = -0.5;
var timeoutVar;
const TIMEOUTINTERVAL = 2000;

// Angles for each type of firework
var angles = [0.0,0.0];
// Angle for 1 group of particles
var groupAng = 0.0;
// Fireworktype flag
var fireworkType;

// Coords for the aim of the firework and its color
var startPos, endPos;
var aimColor;

// Number of bytes per particle
const BYTESPERPARTICLE = 60;
// Max number of points in canvas
const MAXPOINTS = 64000;
// Particle Buffer Size
const PARTICLESBUFFSIZE = BYTESPERPARTICLE*MAXPOINTS;
// AimLine Data Buffer Size in bytes
const LINEBUFFSIZE = (2*2*4)+(4*4*2); // 48
// Factor used to multiply time
const TIMEFACTOR = 0.025;
// Factor used to multiply the velocity
const VELOCITYFACTOR = 2.5;
// Max number of explosion groups
const EXPLOSIONGROUPS = 99;
// Global time
var currTime = 0.0;
// Total particles at the moment
var numbParticles = 0;
// Current buffer offset
var particleBufferCurrOff = 0;
// Acceleration constant
const ACCELARATION = -0.35;

// Create a new firework 30s-30s and currAutoFireWork color
const AUTOFIREWORKINTERVAL = 30;
var currAutoColor;

// Color Pallet Array
var colorPallet = [
    vec4(1.0,0.0,0.3,1.0),
    vec4(0.7,1.0,0.0,1.0),
    vec4(0.0,0.56,1.0,1.0),
    vec4(1.0,0.3,0.0,1.0),
    vec4(0.69,0.5,1.0,1.0),
    vec4(0.0,1.0,0.3,1.0),
    vec4(1.0,0.0,0.0,1.0),
    vec4(0.0,1.0,0.0,1.0),
    vec4(0.0,0.0,1.0,1.0),
    vec4(1.0,1.0,1.0,1.0)
];

/*
 *
 * Attributes and uniform locations
 * 
 */

// Line vertex shader attribs
var vLinePos;
var vLineColor;

// Particles vertex shader attribs
var vPosition;
var vInitVel;
var vInitialTime;
var vETime;
var vETime2;
var vEVel;
var vEVel2;
var fireworkRadius;

// Uniform location vars
var uTime;
var uAceleration;
var uVelocityFactor;


window.onload = function init() {
    canvas = document.getElementById("gl-canvas");
    autoFireText = document.getElementById("autoFireText");
    timeText = document.getElementById("timeText");
    gl = WebGLUtils.setupWebGL(canvas);
    if(!gl) { alert("WebGL isn't available"); }
    
    
    canvas.addEventListener("mousedown", mouseDown);
    canvas.addEventListener("mouseup", mouseUp);
    canvas.addEventListener("mousemove", mouseMove);
    addEventListener("keypress", spaceBar);


    // Configure WebGL
    gl.viewport(0,0,canvas.width, canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    
    /*
     * 
     * Aim Line Shader Initialization
     *
     */
    programLine = initShaders(gl, "vertex-shader-line", "fragment-shader-particles");
    gl.useProgram(programLine);
    
    bfLine = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER,bfLine);
    gl.bufferData(gl.ARRAY_BUFFER, LINEBUFFSIZE, gl.STATIC_DRAW);

    vLinePos = gl.getAttribLocation(programLine, "vPosition");
    vLineColor = gl.getAttribLocation(programLine,"vLineColor");
    
    
    /*
     * 
     * Firework Shader Initialization
     *
     */
    programFirework = initShaders(gl, "vertex-shader-particles", "fragment-shader-particles");
    gl.useProgram(programFirework);

    bfFirework = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER,bfFirework);
    gl.bufferData(gl.ARRAY_BUFFER, PARTICLESBUFFSIZE, gl.STATIC_DRAW);
    // To mix the colors in the canvas
    gl.blendFuncSeparate(gl.SRC_ALPHA, gl.DST_ALPHA, gl.ONE, gl.ONE);
    gl.enable(gl.BLEND);

    vPosition = gl.getAttribLocation(programFirework, "vPosition");
    vInitVel = gl.getAttribLocation(programFirework, "vInitVel");
    vInitialTime = gl.getAttribLocation(programFirework,"vInitialTime");
    vETime = gl.getAttribLocation(programFirework,"vETime");
    vETime2 = gl.getAttribLocation(programFirework,"vETime2");
    vEVel = gl.getAttribLocation(programFirework,"vEVel");
    vEVel2 = gl.getAttribLocation(programFirework,"vEVel2");
    vColor = gl.getAttribLocation(programFirework,"vColor");

    uTime = gl.getUniformLocation(programFirework,"uTime");
    uAceleration = gl.getUniformLocation(programFirework,"uAceleration");
    uVelocityFactor = gl.getUniformLocation(programFirework,"uVelocityFactor"); 

    render();
}


/*
 *
 * Event related functions
 *
 */
function mouseDown(ev){
    if (ev.which == 1)
    {
        isAiming = true;
        startPos = endPos = getMousePos(ev);
        aimColor = generateNewColor();
        gl.bindBuffer(gl.ARRAY_BUFFER,bfLine);
        gl.bufferSubData(gl.ARRAY_BUFFER,0,flatten(startPos));
        gl.bufferSubData(gl.ARRAY_BUFFER,4*2,flatten(endPos));
        gl.bufferSubData(gl.ARRAY_BUFFER,4*4,flatten(aimColor));
        gl.bufferSubData(gl.ARRAY_BUFFER,(4*4)+(4*4),flatten(aimColor));
    }
}

function mouseUp(ev){
    isAiming = false;
    endPos = getMousePos(ev);
    createFirework();
}

function mouseMove(ev){
    if (isAiming){
        endPos = getMousePos(ev);
        gl.bindBuffer(gl.ARRAY_BUFFER,bfLine);
        gl.bufferSubData(gl.ARRAY_BUFFER,4*2,flatten(endPos));
    }
}

function getMousePos(ev){
    var x = -1 + 2*(ev.offsetX/canvas.width);
    var y = 1 - 2*(ev.offsetY/canvas.height);
    return vec2(x,y);
}

function spaceBar(ev){
    if (ev.which == 32){
        autoFirework = !autoFirework;
        if (timeoutVar != null)
            clearTimeout(timeoutVar);
        showTextAutoON();
    }
}

function showTextAutoON(){
    if (autoFirework){
        autoFireText.innerHTML = "&#127881; AutoFirework: ON &#127881;";
        autoFireText.style.color = "lime";
    }
    else{
        autoFireText.innerHTML = "&#127881; AutoFirework: OFF &#127881;";
        autoFireText.style.color = "red";
    }
    autoFireText.style.opacity=1.0;
    timeoutVar = setTimeout(hideText,TIMEOUTINTERVAL);
}

function hideText(){
    autoFireText.style.opacity = 0.0;
}

function showTextTime(){
    timeText.innerHTML = "Time: " + currTime;
}

/*
 *
 * Auxiliary Functions (for certain calculations)
 * 
 */

// Picks a random color from the color pallet
function generateNewColor(){
    var val = Math.round(Math.random()*(colorPallet.length-1));
    return colorPallet[Math.round(val)];
}

// Generates opacity for firework particles
function controlOpacity(pointCoord,color){
    if(Math.abs(pointCoord[0]) <= fireworkRadius/2 && Math.abs(pointCoord[1]) <= fireworkRadius/2){
        color[3]= 1 - fireworkRadius - Math.abs(pointCoord[0]) - Math.abs(pointCoord[1]);
    }
    else{
        color[3]= 0.3 - fireworkRadius + Math.abs(pointCoord[0]) + Math.abs(pointCoord[1]);
    }
    return vec4(color[0],color[1],color[2],color[3]);
}

// Calculates Explosion Coordinates with given initLocation, velocity and explosionTime
function calculateExplosionCoords(initX, initY, initVeloc, expTime){
    var expX = initX + ((VELOCITYFACTOR*initVeloc[0])*expTime);
    var expY = initY + ((VELOCITYFACTOR*initVeloc[1])*expTime) + (0.5*ACCELARATION*expTime*expTime);
    return vec2(expX,expY);
}

// Returns the angle for the given fireworkType
function getAngle(){
    var res;
    switch(fireworkType){
        case 0:
            res = angles[0];
            break;
        case 1:
            res = angles[1];
            break;
        case 2:
            res = Math.round(Math.random() * 360);
            break;
    }
    return res;
}

// Resets the angle of given fireworkType to a new angle
function resetAngle(newAngle){
    switch(fireworkType){
        case 0:
            angles[0] = newAngle;
        case 1:
            angles[1] = newAngle;
        default:
            break;
    }
}

// Updates current fireworkType angle
function updateAngle(){
    switch(fireworkType){
        case 0:
            angles[0] = (angles[0] + 20)%360;
        case 1:
            angles[1] = (angles[1] + 30)%360;
        default:
            break;
    }
}

// Polar Coordinates to generate a radial point
function polarCoords(exploCoord){
    var currentAng = getAngle();
    fireworkRadius = Math.random();
    if (fireworkRadius > 0.2)
        fireworkRadius = fireworkRadius%0.2;

    var x = fireworkRadius * Math.cos(currentAng) + exploCoord[0];
    var y = fireworkRadius * Math.sin(currentAng) + exploCoord[1];

    return vec2(x,y);
}

// Generates a X value with given time
function generateXAxis(t) {
    var x = Math.sin(t);
    if (x >= 0.7)
        x -= 0.15;
    else if (x <= -0.7)
        x += 0.15;
   return x;
}

// Genrates a Y value between the range of [-0.5,0.5]
function generateYAxis() {
    var y = Math.random();
    y = (Math.ceil(Math.random()) == 1) ? (y*1)/2 : y*(-1)/2;
    if (y < -0.5)
        y += 0.5;
    else if (y > 0.5)
        y -= 0.595;
    return y;
}

// Get numberOfParticlesPerGroup and 
// total numberOfGroups with given totalParticles
function getParticles_N_Groups(totalParticles){
    var res = [];
    for (var i = EXPLOSIONGROUPS; i>0; i--){
        if (totalParticles%i == 0){
            // Enforce to have atleast 2 particles per group
            if (totalParticles/i > 2){
                res.push(i);
                res.push(totalParticles/i);
            } // otherwise only 1 group and all particles in that group
            else{
                res.push(1);
                res.push(totalParticles);
            }
            break;
        }
    }
    return res;
}


// Main Firework Generation function
function createFirework(auto=false){
    
    // Number of particles generated for this firework
    var particlesGenerated = Math.round(Math.random() * 240) + 10;
    // Number of particles per group and number of groups of particles
    var particles_groups = getParticles_N_Groups(particlesGenerated);
    // Firework type for this firework
    fireworkType = Math.round(Math.random()*2);

    gl.bindBuffer(gl.ARRAY_BUFFER,bfFirework);
    // Initial velocity and firework color
    var initVel;
    var color;
    //Firework Auto Activated
    if(auto && !isAiming){
        //Lançamentos feitos na vertical
        var xStart = generateXAxis(currTime);
        var yStart = AUTOSTART_YAXIS;
        var xEnd = xStart;
        var yEnd = generateYAxis();
 
        startPos = vec2(xStart, yStart);
        endPos = vec2(xEnd, yEnd);
        initVel = vec2(0,endPos[1]);
        color = currAutoColor;
    }
    else if (!auto) {
        initVel = vec2(endPos[0] - startPos[0],endPos[1]-startPos[1]);
        color = aimColor;
    }
    else
        return;


    // Explosion times calc
    var exploTime1 = Math.abs((VELOCITYFACTOR*initVel[1])/ACCELARATION);
    var exploTime2 = 0.0;
    if (particles_groups[0]>1)
        exploTime2 = exploTime1 + 0.575;

    // 1st Explosition coordinates
    var exploCoords = calculateExplosionCoords(startPos[0], startPos[1], initVel, exploTime1);
    // Particle creation time
    var initTime = currTime*TIMEFACTOR;

    // Array that will fill our particlesDataBuffer
    var buffData = [];

    for (var g = 0; g < particles_groups[1]; g++){
        var pointCoord = polarCoords(exploCoords);
        groupAng = getAngle();
        for(var p = 0; p < particles_groups[0]; p++){
            var exploVel1 = vec2(pointCoord[0]-exploCoords[0],pointCoord[1]-exploCoords[1]);
            var exploCoords2 = calculateExplosionCoords(exploCoords[0],exploCoords[1], exploVel1, exploTime2);
            var pointCoords2 = polarCoords(exploCoords2);
            var exploVel2 = vec2(pointCoords2[0]-exploCoords2[0], pointCoords2[1]-exploCoords2[1]);


            buffData.push(startPos[0]);
            buffData.push(startPos[1]);
            buffData.push(initVel[0]);
            buffData.push(initVel[1]);
            buffData.push(exploVel1[0]);
            buffData.push(exploVel1[1]);
            buffData.push(exploVel2[0]);
            buffData.push(exploVel2[1]);
            buffData.push(initTime);
            buffData.push(exploTime1);
            buffData.push(exploTime2);
            buffData.push(color[0]);
            buffData.push(color[1]);
            buffData.push(color[2]);
            //Update opacity
            color = controlOpacity(pointCoord,color);
            buffData.push(color[3]);
            updateAngle();
        }
        resetAngle(groupAng);
        updateAngle();
    }
    
    // Use buffer's available space to place all data if possible
    // Otherwise fill the remaining space of the buffer with data and
    // and the rest overwrite older particles
    if (particleBufferCurrOff + (BYTESPERPARTICLE*particlesGenerated) <= PARTICLESBUFFSIZE)
    {
        gl.bufferSubData(gl.ARRAY_BUFFER,particleBufferCurrOff,flatten(buffData));
        particleBufferCurrOff = (particleBufferCurrOff+(BYTESPERPARTICLE*particlesGenerated))%PARTICLESBUFFSIZE;
    }
    else    
    {
        // Number of available bytes in the buffer of particles
        var availableSpaceInBytes = PARTICLESBUFFSIZE-particleBufferCurrOff;
        // Conversion of number of bytes to number of floats
        var totalNumbOfFloats = availableSpaceInBytes/4;
        // Remove x floats equal to totalNumbOfFloats from buffData
        var subArr = buffData.splice(0,totalNumbOfFloats);

        // Fill the remaining space of the particles buffer
        gl.bufferSubData(gl.ARRAY_BUFFER,particleBufferCurrOff,flatten(subArr));
        
        // Reset Offset
        particleBufferCurrOff = 0;
        // Calculate the new offset based on the remaining elements on buffdata
        var nextOff = buffData.length*4;
        gl.bufferSubData(gl.ARRAY_BUFFER,particleBufferCurrOff,flatten(buffData));
        particleBufferCurrOff += nextOff;
    }
    numbParticles += particlesGenerated;
}


function render() {
    currTime += 1;
    showTextTime();
    gl.clear(gl.COLOR_BUFFER_BIT);
    if (isAiming){
        aimDraw();
    }
    if(autoFirework) {
        if(currTime % AUTOFIREWORKINTERVAL == 0){
            currAutoColor = generateNewColor();
            createFirework(true);
        }
    }
    fireWorkDraw();
    requestAnimationFrame(render);
}

function aimDraw() {
    gl.useProgram(programLine);
    gl.bindBuffer(gl.ARRAY_BUFFER, bfLine);
    gl.vertexAttribPointer(vLinePos, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vLinePos);
    gl.vertexAttribPointer(vLineColor, 4, gl.FLOAT, false, 0, 16);
    gl.enableVertexAttribArray(vLineColor);
    gl.drawArrays(gl.POINTS, 0, 1);
    gl.drawArrays(gl.LINES, 0, 2);
}

function fireWorkDraw() {
    gl.useProgram(programFirework);
    gl.bindBuffer(gl.ARRAY_BUFFER, bfFirework);
    gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, BYTESPERPARTICLE, 0);
    gl.enableVertexAttribArray(vPosition);
    gl.vertexAttribPointer(vInitVel, 2, gl.FLOAT, false, BYTESPERPARTICLE, 8);
    gl.enableVertexAttribArray(vInitVel);
    gl.vertexAttribPointer(vEVel, 2, gl.FLOAT, false, BYTESPERPARTICLE, 16);
    gl.enableVertexAttribArray(vEVel);
    gl.vertexAttribPointer(vEVel2, 2, gl.FLOAT, false, BYTESPERPARTICLE, 24);
    gl.enableVertexAttribArray(vEVel2);
    gl.vertexAttribPointer(vInitialTime, 1, gl.FLOAT, false, BYTESPERPARTICLE, 32);
    gl.enableVertexAttribArray(vInitialTime);
    gl.vertexAttribPointer(vETime, 1, gl.FLOAT, false, BYTESPERPARTICLE, 36);
    gl.enableVertexAttribArray(vETime);
    gl.vertexAttribPointer(vETime2, 1, gl.FLOAT, false, BYTESPERPARTICLE, 40);
    gl.enableVertexAttribArray(vETime2);
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, BYTESPERPARTICLE, 44);
    gl.enableVertexAttribArray(vColor);
    gl.uniform1f(uTime, currTime * TIMEFACTOR);
    gl.uniform1f(uAceleration, ACCELARATION);
    gl.uniform1f(uVelocityFactor, VELOCITYFACTOR);
    gl.drawArrays(gl.POINTS, 0, numbParticles);
}

