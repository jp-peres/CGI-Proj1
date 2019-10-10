var gl;

// BufferVars
var bfLine, bfFirework;
var canvas;

// Program Vars
var programLine, programFirework;


// Boolean to control the drawing of the Aim Line
var isAiming = false;

// To start and end auto firework
var autoFirework = false;

// Coords for the aim of the firework
var startPos;
var endPos;

// MAX NUMBER OF FRAGMENTS
const BUFFSIZE = 64000;

// Factor used to multiply time
const TIMEFACTOR = 0.025;

// Factor used to multiply the velocity
const VELOCITYFACTOR = 2.5;

// Factor used to multiply the explosion vector
const EXPLOSIONFACTOR = 1;


// Global time
var currTime = 0.0;

// Total fragments at the moment
var numbFragments = 0;

// Current buffer offset
var currOff = 0;

// Acceleration constant
const ACCELARATION = -0.35;

// Number of bytes per particle
const BYTESPERPARTICLE = 32;

// Create a new firework 30s-30s
const AUTOFIREWORKINTERVAL = 30;

//
// Location vars
//

// Line vertex shader attribs
var vLinePos;

// Particles vertex shader attribs
var vPosition;
var vInitVel;
var vInitialTime;
var vETime;
var vEInitPos;
var vEVel;

// Uniform location vars
var uTime;
var uAceleration;
var uVelocityFactor;



window.onload = function init() {
    canvas = document.getElementById("gl-canvas");
    gl = WebGLUtils.setupWebGL(canvas);
    if(!gl) { alert("WebGL isn't available"); }
    
    
    canvas.addEventListener("mousedown", mouseDown);
    canvas.addEventListener("mouseup", mouseUp);
    canvas.addEventListener("mousemove", mouseMove);
    addEventListener("keypress", spaceBar);


    // Configure WebGL
    gl.viewport(0,0,canvas.width, canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    
    // Aim Line Shader
    programLine = initShaders(gl, "vertex-shader-line", "fragment-shader");
    gl.useProgram(programLine);

    // Load the data into the GPU
    bfLine = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER,bfLine);
    gl.bufferData(gl.ARRAY_BUFFER, 2*2*4, gl.STATIC_DRAW);

    // Associate our shader variables with our data buffer
    vLinePos = gl.getAttribLocation(programLine, "vPosition");

    // Firework Shader
    programFirework = initShaders(gl, "vertex-shader-fragments", "fragment-shader");
    gl.useProgram(programFirework);

  
    bfFirework = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER,bfFirework);
    gl.bufferData(gl.ARRAY_BUFFER, BUFFSIZE, gl.STATIC_DRAW);

    // Associate our shader variables with our data buffer
    vPosition = gl.getAttribLocation(programFirework, "vPosition");

    vInitVel = gl.getAttribLocation(programFirework, "vInitVel");

    vInitialTime = gl.getAttribLocation(programFirework,"vInitialTime");

    vETime = gl.getAttribLocation(programFirework,"vETime");

    vEVel = gl.getAttribLocation(programFirework,"vEVel");

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
        gl.bindBuffer(gl.ARRAY_BUFFER,bfLine);
        gl.bufferSubData(gl.ARRAY_BUFFER,0,flatten(startPos));
        gl.bufferSubData(gl.ARRAY_BUFFER,4*2,flatten(endPos));
    }
}

// Generate points between [-1,1]
function getPointsBetween(){
    var num = Math.random();
    return (Math.ceil(Math.random()) == 1) ? (num*1)/2 : num*(-1)/2;
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


// TODO: simulate random firework via spacebar keypress
function spaceBar(ev){
    if (ev.which == 32){
        autoFirework = !autoFirework;
    }
}


function calculateExplosionCoords(initX, initY, initVeloc, expTime){
    var expX = initX + ((VELOCITYFACTOR*initVeloc[0])*expTime);
    var expY = initY + ((VELOCITYFACTOR*initVeloc[1])*expTime) + (0.5*ACCELARATION*expTime*expTime);
    return vec2(expX,expY);
}

function polarCoords(exploCoords){
    var radius = Math.random();
    if (radius > 0.2)
        radius = radius%0.2;
    var angle = Math.round(Math.random() * 360);
    
    var x = radius * Math.cos(angle) + exploCoords[0];
    var y = radius * Math.sin(angle) + exploCoords[1];
    return vec2(x,y);
}


// TODO: Generate points for firework

function createFirework(auto=false){
    var auxNumbFragments = Math.round(Math.random() * 240) + 10;
    gl.bindBuffer(gl.ARRAY_BUFFER,bfFirework);
    var initVel;
    //Firework Auto Activated
    if(auto && !isAiming){
        //Lançamentos feitos na vertical
        var xStart = Math.sin(currTime);
        console.log(xStart);
        if (xStart >= 0.7)
            xStart -= 0.15;
        else if (xStart <= -0.7)
            xStart += 0.15;
        var yStart = -0.5;
        var xEnd = xStart;
        var yEnd = getPointsBetween();
 
        if(yEnd < -0.5){
            yEnd = yEnd+0.5;
        }
        else if (yEnd > 0.5){
            yEnd = yEnd-0.595;
        }
        startPos = vec2(xStart, yStart);
        endPos = vec2(xEnd, yEnd);
        initVel = vec2(0,endPos[1]);
        console.log("Auto -" + initVel);
    }
    else if (!auto) {
        initVel = vec2(endPos[0] - startPos[0],endPos[1]-startPos[1]);
        console.log("Not auto- " + initVel);
    }
    else
        return;

    //console.log(initVel);
    var exploTime = Math.abs((VELOCITYFACTOR*initVel[1])/ACCELARATION);
    var exploCoords = calculateExplosionCoords(startPos[0], startPos[1], initVel, exploTime);
    //var exploTime = 0.7;
    
    var initTime = currTime*TIMEFACTOR;

    //
    /*var initVel = vec2(0.001,0.003);
    var pos = vec2(-0.3,0);

    var velExplo = vec2(0,0);
    var tInicial = currTime;
    var tEInicial = 0;
    
    console.log(tInicial);

    gl.bufferSubData(gl.ARRAY_BUFFER,0,flatten(pos));
    gl.bufferSubData(gl.ARRAY_BUFFER,8,flatten(initVel));
    gl.bufferSubData(gl.ARRAY_BUFFER,16,flatten(velExplo));
    gl.bufferSubData(gl.ARRAY_BUFFER,24,flatten([tInicial]));
    gl.bufferSubData(gl.ARRAY_BUFFER,28,flatten([tEInicial]));
    */

    var buffData = [];
    for (var i = 0; i < auxNumbFragments; i++)
    {
        var pointCoord = polarCoords(exploCoords);
        var newVel = vec2(pointCoord[0]-exploCoords[0],pointCoord[1]-exploCoords[1]);
        buffData.push(startPos[0]);
        buffData.push(startPos[1]);
        buffData.push(initVel[0]);
        buffData.push(initVel[1]);
        buffData.push(newVel[0]);
        buffData.push(newVel[1]);
        buffData.push(initTime);
        buffData.push(exploTime);
    }

    if (currOff + (BYTESPERPARTICLE*auxNumbFragments) <= BUFFSIZE)
    {
        gl.bufferSubData(gl.ARRAY_BUFFER,currOff,flatten(buffData));
        currOff = (currOff+(BYTESPERPARTICLE*auxNumbFragments))%BUFFSIZE;
    }
    else    
    {
        // Number of available bytes in the buffer of particles
        var availableSpaceInBytes = BUFFSIZE-currOff;
        // Conversion of number of bytes to number of floats
        var totalNumbOfFloats = availableSpaceInBytes/4;

        // Remove x floats equal to totalNumbOfFloats from buffData
        var subArr = buffData.splice(0,totalNumbOfFloats);

        // Fill the remaining space of the particles buffer
        gl.bufferSubData(gl.ARRAY_BUFFER,currOff,flatten(subArr));
        
        // Reset Offset
        currOff = 0;
        // Calculate the new offset based on the remaining elements on buffdata
        var nextOff = buffData.length*4;
        gl.bufferSubData(gl.ARRAY_BUFFER,currOff,flatten(buffData));
        currOff += nextOff;
    }
    numbFragments += auxNumbFragments;
}

// TODO: render not going well
function render() {
    currTime += 1;
    gl.clear(gl.COLOR_BUFFER_BIT);
    if (isAiming){
        gl.useProgram(programLine);
        gl.bindBuffer(gl.ARRAY_BUFFER,bfLine);  
        gl.vertexAttribPointer(vLinePos, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(vLinePos);
        gl.drawArrays(gl.POINTS,0,1);
        gl.drawArrays(gl.LINES,0,2);
    }
    if(autoFirework) {
        if(currTime % AUTOFIREWORKINTERVAL == 0){
            createFirework(true);
        }
    }
    gl.useProgram(programFirework);
    gl.bindBuffer(gl.ARRAY_BUFFER,bfFirework);
    
    gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, BYTESPERPARTICLE, 0);
    gl.enableVertexAttribArray(vPosition);

    gl.vertexAttribPointer(vInitVel, 2, gl.FLOAT, false, BYTESPERPARTICLE, 8);
    gl.enableVertexAttribArray(vInitVel);

    gl.vertexAttribPointer(vEVel, 2, gl.FLOAT, false, BYTESPERPARTICLE, 16);
    gl.enableVertexAttribArray(vEVel);

    gl.vertexAttribPointer(vInitialTime, 1, gl.FLOAT, false, BYTESPERPARTICLE, 24);
    gl.enableVertexAttribArray(vInitialTime);

    gl.vertexAttribPointer(vETime, 1, gl.FLOAT, false, BYTESPERPARTICLE, 28);
    gl.enableVertexAttribArray(vETime);

    gl.uniform1f(uTime,currTime*TIMEFACTOR);
    gl.uniform1f(uAceleration,ACCELARATION);
    gl.uniform1f(uVelocityFactor,VELOCITYFACTOR);
    gl.drawArrays(gl.POINTS,0,numbFragments);
    requestAnimationFrame(render);
}
