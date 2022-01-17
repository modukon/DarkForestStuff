// canvas color picker plugin - Dark Forest crypto	

// lets you move around with the mouse inside the game to see different color codes
// click the mouse to save a color

let canvas;
let gl;
let renderHappened = false;
let panelMouseMove;
let panelMouseClick;

function rgbToHex(r, g, b) {
	if (r > 255 || g > 255 || b > 255) throw "Invalid color component";
	return ((r << 16) | (g << 8) | b).toString(16);
}

async function getPixel(x, y) {
	let resolve, reject; let promise = new Promise((res, rej) => { resolve=res; reject=rej; });
	window.requestAnimationFrame(()=>{
		let pixels = new Uint8Array(4); // 1 pixel = 4 bytes
		gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels); // read 1x1 pixel at x y
		resolve(pixels);
	});
	return promise;
}

function Panel(div, defaultText) {
	let o = {};
	
	const width = 420;
	const height = 30;
	
	o.div = document.createElement("div");
	o.div.style.width = width+"px";
	o.div.style.height = height+"px";
	o.div.style.textAlign = "center";
	div.appendChild(o.div);
	
	let divCoords = document.createElement("div");
	divCoords.style.width = "125px";
	divCoords.style.height = "100%";
	divCoords.style.float = "left";
	o.div.appendChild(divCoords);
	function setCoords(x, y) {
		x = Math.round(x);
		y = Math.round(y);
		divCoords.innerHTML = "x:"+x+" y:"+y;
	}
	divCoords.innerHTML = defaultText;
	
	let divColor = document.createElement("div");
	divColor.style.width = "70px";
	divColor.style.height = "100%";
	divColor.style.float = "left";
	o.div.appendChild(divColor);
	
	let divHex = document.createElement("div");
	divHex.style.width = "65px";
	divHex.style.height = "100%";
	divHex.style.float = "left";
	o.div.appendChild(divHex);
	
	let div255 = document.createElement("div");
	div255.style.width = "160px";
	div255.style.height = "100%";
	div255.style.float = "left";
	o.div.appendChild(div255);
	
	o.setColor = async function(mouseEvent) {
		let { x, y } = getCanvasCoordsFromMouse(mouseEvent);
		setCoords(x, y);
		let p = await getPixel(x, y);
		let hex = "#" + ("000000" + rgbToHex(p[0], p[1], p[2])).slice(-6);
		divColor.style.backgroundColor = hex;
		divHex.innerHTML = hex;
		div255.innerHTML = "["+p[0]+", "+p[1]+", "+p[2]+"]";
	}
	
	return o;
}

function getCanvasCoordsFromMouse(mouseEvent) {
	let x = mouseEvent.pageX;
	let y = canvas.height - mouseEvent.pageY;
	return { "x": x, "y": y };
}

function render(div) {
	if (renderHappened) return;
	renderHappened = true;
	
	div.style.backgroundColor = "#000";
	div.style.width = "420px";
	
	canvas = document.getElementsByTagName('canvas')[0];
	gl = canvas.getContext("webgl2")
	
	panelMouseMove = Panel(div, "move mouse");
	panelMouseMove.div.style.marginTop = "5px";
	panelMouseMove.div.style.marginBottom = "10px";
	window.addEventListener("mousemove", panelMouseMove.setColor);
	panelMouseClick = Panel(div, "click mouse");
	window.addEventListener("click", panelMouseClick.setColor);
}

function destroy() {
	window.removeEventListener("mousemove", panelMouseMove.setColor);
	window.removeEventListener("click", panelMouseClick.setColor);
}

class Plugin {
	render(div) { render(div); }
	destroy() { destroy(); }
}

export default Plugin;
