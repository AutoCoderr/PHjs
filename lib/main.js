var rfs = require('require-from-string');
var http = require("http");
var https = require("https");
var fs = require("fs");

	
var StartServer = function (path,type,port,certs,yo) {
	if (typeof(path) != "string") {
		var err = new Error("Variable 'path' incorrecte");
		throw err;
	}
	if (typeof(type) != "string") {
		var err = new Error("Variable 'type' incorrecte");
		throw err;
	}
	if (typeof(port) != "string" & typeof(port) != "number") {
		var err = new Error("Variable 'port' incorrecte");
		throw err;
	}
	if (typeof(certs) != "object") {
		console.log("si vous êtes en mode http, vous pouvez mettre un object vide pour cette variable")
		var err = new Error("Variable 'certs' incorrecte");
		throw err;
	}
	if (typeof(port) == 'string') {
		port = parseInt(port);
	}
	
	if (!fs.existsSync(path)) {
		var err = new Error("Le chemin '" + path + "' n'existe pas");
		throw err;
	}
	if (path[path.length-1] == "/") {
			path = path.substring(0,path.length-1);
	}
	
	var server = http.createServer(function(req, res) { // --------------------------> LE SERVEUR HTTP <------------------------------------------------------
		var page = url.parse(req.url).pathname;
		var param = url.parse(req.url).query;
		if (page == "") {
			page = "/";
		}
		if (page[page.length-1] == "/"){
			if (page != "/") {
				if (fs.existsSync(path + page + (page.split("/")[page.split("/").length-1]) + ".html")) {
					page = page + (page.split("/")[page.split("/").length-1]) + ".html";
				} else if (fs.existsSync(path + page + (page.split("/")[page.split("/").length-1]) + ".js")) {
					page = page + (page.split("/")[page.split("/").length-1]) + ".js";
				} else if (fs.existsSync(path + page + (page.split("/")[page.split("/").length-1]) + ".phjs")) {
					page = page + (page.split("/")[page.split("/").length-1]) + ".phjs";
				}
            }			
			if (fs.existsSync(path + page + "index.phjs")) {
				page = page + "index.phjs";
			} else if (fs.existsSync(path + page + "index.html")) {
				page = page + "index.html";
			} else if (fs.existsSync(path + page + "index.js")) {
				page = page + "index.js";
			}
		}
		if (page[page.length-1] == "/"){
			if(fs.existsSync(path + page)) {
				fs.readdir(path + page, function(err, items) {
					res.writeHead(200, {"Content-Type": "text/html"});
					if (page != "/") {
						res.write("<a href='..'><font color='grey' size='4'>dossier parent</font></a>");
					}
					res.write("<table>");
					for (var i=0; i<items.length; i++) {
						try {
							fs.readdirSync(path + page + items[i]);
							res.write("<tr><td>Folder : <a href='" + page + items[i] + "/'>" + items[i] + "</a></td></tr>");
						} catch(e) {
							res.write("<tr><td>File : <a href='" + page + items[i] + "'>" + items[i] + "</a></td></tr>");
						}
					}
					res.end("</table>");
				});
			} else {
				res.writeHead(404, {"Content-Type": "text/plain"});
				res.end("ERROR 404 : Page not found");
			}
			return;
		}
		page = path + page;
		console.log(page);
		var ext = page.split(".")[page.split(".").length-1]
		if (ext == "mp3") {
			fs.stat(page, function(error,stats) {
				if (error) {
					res.writeHead(404, {"Content-Type": "text/plain"});
					res.end("ERROR 404 : Page not found");
				} else {
					res.writeHead(200, {
					'Content-Type': 'audio/mpeg',
					'Content-Length': stats.size
					});
					fs.createReadStream(page).pipe(res);
				}
			});
		} else if (ext == "png" | ext == "jpg" | ext == "gif" | ext == "jpeg" | ext == "bmp" | ext == "tif" | ext == "tiff") {
			fs.readFile(page, function(error, content) {
				if(error){
					res.writeHead(404, {"Content-Type": "text/plain"});
					res.end("ERROR 404 : Page not found");
				} else {
					res.writeHead(200, {"Content-Type": "image/" + ext});
					res.end(content);
				}	
		});
		} else if (ext == "phjs") {
			ProcessPage(page);
		} else {	
			fs.readFile(page, 'utf-8', function(error, content) {
			  if(error){
				  res.writeHead(404, {"Content-Type": "text/plain"});
				  res.end("ERROR 404 : Page not found");
			  } else {
				  if (page == "./serv.js") {
					  res.writeHead(404, {"Content-Type": "text/plain"});
					  res.end("ERROR 404 : Page not found");
				  } else {
  					  res.writeHead(200, {"Content-Type": "text/html"});
					  res.end(content);
				  }
			  }
			});
		}
	});
	server.listen(port);
}

function ProcessPage(page) {
	var file = fs.readFileSync(page, "UTF-8");
	file = "function start(echo) { " + file + " } module.exports = { start: start };"
	file = rfs(file);
	file.start(function (chaine) { console.log(chaine) });
}

module.exports = {
	StartServer: StartServer
};