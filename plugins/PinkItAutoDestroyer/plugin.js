
// made for DF Archon Ares v0.1 Round 2
// can be used to automatically destroy all planets inside the pink circle (using dropped bomb from the pink ship)

const pluginName = "PinkItAutoDestroyer";

const cSpace = "&nbsp;"
const minCircleSizePx = 5;
const minDrawPlanetRadius = 20;
const circleThickness = 3;
const PI2 = Math.PI * 2;

const pinkCircleRadius = 2000;
const minPinkLevel = 3; // cant pink level below 3

let choosenPlanets = [];
let deadPlanets = [];
let dieingPlanet = null;
let stopPinkIt = false;
let excludeMyPlanets = true;
let excludeOwnedPlanets = true;

function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

function planetHasNoOwner(planet) {
	return planet.owner === "0x0000000000000000000000000000000000000000";
}

function planetIsMine(planet) {
	return planet.owner === df.account;
}

function createToggleButton(text, onClick, onOrOff=false) {
	const button = {};
   	button.element = document.createElement('button');
	button.element.innerText = text;
	button.onOrOff = false;
	button.set = function(b) {
		button.onOrOff = b;
		if (button.onOrOff) { // on
			button.element.style.background='#CCC';
			button.element.style.color='#000000';
		} else { // off
			button.element.style.background='#333333';
			button.element.style.color='#FFF';
		}
	}
	button.set(onOrOff);
   	button.element.addEventListener('click', ()=>{
		button.set(!button.onOrOff);
		onClick(button.onOrOff);
	});
	return button;
}

function intToStrHexColor(num) {
	var color = num.toString(16).toUpperCase();
	if (color.length < 2) color = "0"+color;
	return color;
}
function percentToStrHexColor(percent) {
	return intToStrHexColor(parseInt(percent*255));
}
function getPlanetRingRadius(planet, multiplier=1.3, min=minDrawPlanetRadius) {
    const viewport = ui.getViewport();
	let radius = viewport.worldToCanvasDist(ui.getRadiusOfPlanetLevel(planet.planetLevel));
	radius *= multiplier;
	if (radius < min) radius = min;
	return radius;
}
function drawRingAnimationOnPlanet(ctx, planet, level, color, reverse=false) {
    const viewport = ui.getViewport();
	const { x: planetX, y: planetY } = viewport.worldToCanvasCoords(planet.location.coords);

	let radius = getPlanetRingRadius(planet);

	let animationDuration = 1500;
	animationDuration *= (1 - level*0.1);
	
	var millis = Date.now();

	for (var i=0; i<=level; ++i) {
		drawRingAnimation(ctx, planetX, planetY, radius, millis, animationDuration, color, reverse);
		millis += animationDuration / (level+1);
	}
}
function drawRingAnimation(ctx, x, y, radius, millis, animationDuration, color, reverse=false) {
	let time = (millis % animationDuration) / animationDuration;
	if (reverse) time = 1 - time;
	const thickness = 1 - time*0.2;
	let opacity = 1 - time;
	if (opacity > 0.6) opacity *= 1-(opacity-0.6)/0.4;
	opacity = percentToStrHexColor(opacity);
	radius += radius * time * 1.1;
	drawRing2(ctx, x, y, radius, thickness, color+opacity);
}
function drawRing2(ctx, x, y, radius, thickness=0.8, color) {
	ctx.beginPath();
	ctx.strokeStyle = color;
	ctx.fillStyle = color;
	ctx.arc(x, y, radius, 0, PI2, false);
	ctx.arc(x, y, radius * thickness, 0, PI2, true);
	ctx.fill();
}

function getDistBetweenPlanets(planetA, planetB) {
	return df.getDistCoords(planetA.location.coords, planetB.location.coords);
}

function setChoosenPlanets() {
	if (pinkItIsRunning) return;
	let selectedPlanet = ui.getSelectedPlanet();
	choosenPlanets = [];
	deadPlanets = [];
	if (!selectedPlanet) return;
	let planets = df.getAllPlanets();
	for (let p of planets) {
		if (!p.location) continue;
		if (p.planetLevel < minPinkLevel) continue;
		if (excludeOwnedPlanets && !planetHasNoOwner(p)) continue;
		if (excludeMyPlanets && planetIsMine(p)) continue;
		if (getDistBetweenPlanets(selectedPlanet, p) > pinkCircleRadius) continue;
		if (p.destroyed) deadPlanets.push(p);
		else choosenPlanets.push(p);
	}
//	console.log("found "+choosenPlanets.length+" choosenPlanets and "+deadPlanets.length+" deadPlanets");
}

let pinkItIsRunning = false;
async function pinkIt() {
	pinkItIsRunning = true;
	for (let p of choosenPlanets) {
		if (stopPinkIt) break;
		if (p.destroyed) continue;
		console.log("df.pinkLocation('"+p.locationId+"')");
//		console.log("ui.centerLocationId('"+p.locationId+"')");
		dieingPlanet = p;
		try {
			await df.pinkLocation(p.locationId);
		} catch (err) {
			console.error(err);
		}
		// we have to wait for planet being destroyed otherwise next df.pinkLocation will fail
		for (let i=0; i<30; ++i) {
			if (p.destroyed) break;
			await sleep(500);
			if (stopPinkIt) break;
		}
		deadPlanets.push(p);
	}
	dieingPlanet = null;
	pinkItIsRunning = false;
	stopPinkIt = false;
	setChoosenPlanets();
}

function setExcludeOwnedPlanets(onOrOff) {
	setChoosenPlanets();
	excludeOwnedPlanets = onOrOff;
}

function setExcludeMyPlanets(onOrOff) {
	setChoosenPlanets();
	excludeMyPlanets = onOrOff;
}

function onMouseClick() {
	setChoosenPlanets();
}

function Plugin() {
	var o = {};

	o.container = null;

    o.init = function() {
		window.addEventListener("click", onMouseClick);
		setChoosenPlanets();
	}

    o.render = function(container) {
		container.width = "400px";
		o.container = container;
		let div = document.createElement("div");
		div.innerHTML = "select the planet in the center of the pink circle<br>highlights all planets that will be destroyed<br>black = dead planets<br>purple = destroy these planets";
		div.style.width = "100%";
		div.style.textAlign = "center";
		container.append(div);
		
		var div2 = document.createElement("div");
		div2.innerHTML = cSpace;
		container.append(div2);
		
		let toggleButDiv = document.createElement("div");
		toggleButDiv.style.textAlign = "center";
		toggleButDiv.padding = "2px";
		container.append(toggleButDiv);
		let butExcludeOwned = createToggleButton("exclude owned planets", setExcludeOwnedPlanets, true);
		butExcludeOwned.element.style.width = "48%";
		butExcludeOwned.element.style.padding = "2%";
		toggleButDiv.append(butExcludeOwned.element);
		
		var div2 = document.createElement("div");
		div2.innerHTML = cSpace;
		div2.style.display = "inline-block";
		toggleButDiv.append(div2);
		
		let butExcludeMine = createToggleButton("exclude my planets", setExcludeMyPlanets, true);
		butExcludeMine.element.style.width = "48%";
		butExcludeMine.element.style.padding = "2%";
		toggleButDiv.append(butExcludeMine.element);
		
		var div2 = document.createElement("div");
		div2.innerHTML = cSpace;
		container.append(div2);
		
		let button = document.createElement('button');
		button.innerHTML = "PINK IT";
		button.style.width = "100%";
   		button.addEventListener('click', ()=> {
			if (!pinkItIsRunning) {
				if (!ui.getSelectedPlanet()) {
					console.error("first you have to select a planet");
					return;
				}
				pinkIt();
				button.innerHTML = "OH MY GOD! STOP IT NOW!";
			} else {
				stopPinkIt = true;
				button.innerHTML = "PINK IT";
			}
		});
		container.append(button);
    }

    o.draw = function(ctx) {
		o.drawAllRings(ctx);
    }
	
	o.drawAllRings = function(ctx) {
		if (dieingPlanet) {
			drawRingAnimationOnPlanet(ctx, dieingPlanet, 2, "#000000", true);
		}
		for (let p of choosenPlanets) {
			o.drawRingAroundPlanet(p, ctx, '#60F');
		}
		for (let p of deadPlanets) {
			o.drawRingAroundPlanet(p, ctx, '#000');
		}
	}

    o.drawRingAroundPlanet = function(planet, ctx, color='#60A') {
        const viewport = ui.getViewport();

        // planet coordinates relative to the player
        const { x: planetX, y: planetY } = viewport.worldToCanvasCoords(planet.location.coords);

        // planet radius in px
        var planetCtxPixelRadius = viewport.worldToCanvasDist(ui.getRadiusOfPlanetLevel(planet.planetLevel));
		planetCtxPixelRadius *= 0.75;
		if (planetCtxPixelRadius < minCircleSizePx) planetCtxPixelRadius = minCircleSizePx;

        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.arc(planetX, planetY, planetCtxPixelRadius*2, 0, Math.PI * 2, false);
        ctx.arc(planetX, planetY, planetCtxPixelRadius*2-circleThickness, 0, Math.PI * 2, true);
        ctx.fill();
    }

    o.destroy = function() {
		stopPinkIt = true;
		window.removeEventListener("click", o.onMouseClick);
	}

	o.init();
	return o;
}

class PinkIt {
    constructor() {
		this.plugin = Plugin();
    }
    render(div) {
		this.plugin.render(div);
    }
    draw(ctx) {
		this.plugin.draw(ctx);
	}
    destroy() {
		this.plugin.destroy();
    }
}

export default PinkIt;
