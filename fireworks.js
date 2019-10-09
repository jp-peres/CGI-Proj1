var gl;
var isAiming = false;
// BufferVars
var bfLine, bfFirework;
var canvas;

// Program Vars
var programLine, programFirework;

// Coords for the aim of the firework
var startPos;
var endPos;

// MAX NUMBER OF FRAGMENTS
const MAXPOINTS = 64000;

// Factor by time
const TIMEFACTOR = 0.025;
const EXPLOSFACTOR = 2.5;

// Current time
var currTime = 0.0;

// Uniform location vars
var uTime;
var uAceleration;
// Total fragments at the moment
var numbFragments = 0;

var currOff = 0;

const accelaration = -0.35;

//
// Location vars
//

// Line vertex shader
var vLinePos;

// Fragments vertex shader vars
var vPosition;
var vInitVel;
var vInitialTime;
var vETime;
var vEInitPos;
var vEVel;


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
    // Alternativa de construir o buffer data
    // gl.bufferData(gl.ARRAY_BUFFER, vertices.length * 2 * 4, gl.STATIC_DRAW)
    // gl.bufferSubData(gl.ARRAY_BUFFER, 2*8, flatten(novoVer))

    // Associate our shader variables with our data buffer
    vLinePos = gl.getAttribLocation(programLine, "vPosition");

    // Firework Shader
    programFirework = initShaders(gl, "vertex-shader-fragments", "fragment-shader");
    gl.useProgram(programFirework);

  
    bfFirework = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER,bfFirework);
    gl.bufferData(gl.ARRAY_BUFFER, MAXPOINTS, gl.STATIC_DRAW);

    // Associate our shader variables with our data buffer
    vPosition = gl.getAttribLocation(programFirework, "vPosition");

    vInitVel = gl.getAttribLocation(programFirework, "vInitVel");

    vInitialTime = gl.getAttribLocation(programFirework,"vInitialTime");

    vETime = gl.getAttribLocation(programFirework,"vETime");

    vEVel = gl.getAttribLocation(programFirework,"vEVel");

    vEInitPos = gl.getAttribLocation(programFirework,"vEInitPos");

    uTime = gl.getUniformLocation(programFirework,"uTime");

    uAceleration = gl.getUniformLocation(programFirework,"uAceleration");

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
    }
}


function calculateExplosionCoords(initX, initY, initVeloc, expTime){
    var expX = initX + ((EXPLOSFACTOR*initVeloc[0])*expTime);
    var expY = initY + ((EXPLOSFACTOR*initVeloc[1])*expTime) + (0.5*accelaration*expTime*expTime);
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

function createFirework(){
    var auxNumbFragments = Math.round(Math.random() * 240) + 10;
    gl.bindBuffer(gl.ARRAY_BUFFER,bfFirework);
    var initVel = vec2(endPos[0] - startPos[0],endPos[1]-startPos[1]);
    console.log(initVel);
    //console.log(initVel);
    var exploTime = Math.abs((EXPLOSFACTOR*initVel[1])/accelaration);
    var exploCoords = calculateExplosionCoords(startPos[0], startPos[1], initVel, exploTime);
    //var exploTime = 0.7;
    
    var initTime = currTime*TIMEFACTOR;

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
        console.log("||||||||||||||||||||||||");
        console.log("Coordenadas de explosao: " + exploCoords);
        console.log("Coordenadas da velocidade: " + newVel);
        buffData.push(startPos[0]);
        buffData.push(startPos[1]);
        buffData.push(initVel[0]);
        buffData.push(initVel[1]);
        buffData.push(newVel[0]);
        buffData.push(newVel[1]);
        buffData.push(exploCoords[0]);
        buffData.push(exploCoords[1]);
        buffData.push(initTime);
        buffData.push(exploTime);
    }

    if (currOff + (40*auxNumbFragments) <= MAXPOINTS)
    {
        gl.bufferSubData(gl.ARRAY_BUFFER,currOff,flatten(buffData));
        currOff = (currOff+(40*auxNumbFragments))%MAXPOINTS;
    }
    else    
    {
        // Number of available bytes in the buffer of particles
        var availableSpaceInBytes = MAXPOINTS-currOff;
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
    gl.useProgram(programFirework);
    gl.bindBuffer(gl.ARRAY_BUFFER,bfFirework);
    
    gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 40, 0);
    gl.enableVertexAttribArray(vPosition);

    gl.vertexAttribPointer(vInitVel, 2, gl.FLOAT, false, 40, 8);
    gl.enableVertexAttribArray(vInitVel);

    gl.vertexAttribPointer(vEVel, 2, gl.FLOAT, false, 40, 16);
    gl.enableVertexAttribArray(vEVel);

    gl.vertexAttribPointer(vEInitPos, 2, gl.FLOAT, false, 40, 24);
    gl.enableVertexAttribArray(vEInitPos);

    gl.vertexAttribPointer(vInitialTime, 1, gl.FLOAT, false, 40, 32);
    gl.enableVertexAttribArray(vInitialTime);

    gl.vertexAttribPointer(vETime, 1, gl.FLOAT, false, 40, 36);
    gl.enableVertexAttribArray(vETime);

    gl.uniform1f(uTime,currTime*TIMEFACTOR);
    gl.uniform1f(uAceleration,accelaration);
    gl.drawArrays(gl.POINTS,0,numbFragments);
    requestAnimationFrame(render);
}
