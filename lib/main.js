var rfs = require('require-from-string');
var http = require("http");
var https = require("https");
var fs = require("fs");
var url = require('url')

	
var StartServer = function (path,type,port,certs,libs) {
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
		console.log("si vous êtes en mode http, vous pouvez mettre un object vide '{}' pour cette variable")
		var err = new Error("Variable 'certs' incorrecte");
		throw err;
	} else if ((type == 'https') & (typeof(certs.key) == "undefined" | typeof(certs.cert) == "undefined" | typeof(certs.ca) == "undefined")) {
		var err = new Error("Variable 'certs' incorrecte");
		throw err;
	}
	if (typeof(libs) != "object") {
		console.log("si vous ne voulez pas mettre de modules, vous pouvez mettre un object vide '{}' pour cette variable")
		var err = new Error("Variable 'libs' incorrecte");
		throw err;
	}
	if (!fs.existsSync(path)) {
		var err = new Error("Le chemin '" + path + "' n'existe pas");
		throw err;
	}
	if (typeof(port) == 'string') {
		port = parseInt(port);
	}
	if (path[path.length-1] == "/") {
			path = path.substring(0,path.length-1);
	}
	
	http.createServer(function(req, res) { // --------------------------> LE SERVEUR HTTP <------------------------------------------------------
		var page = url.parse(req.url).pathname;
		var param = url.parse(req.url).query;
		if (page == "") {
			page = "/";
		}
		if (page[page.length-1] == "/"){
			if (page != "/") {
				if (fs.existsSync(path + page + (page.split("/")[page.split("/").length-2]) + ".html") & (page.split("/")[page.split("/").length-2]) != "index") {
					page = page + (page.split("/")[page.split("/").length-2]) + ".html";
				} else if (fs.existsSync(path + page + (page.split("/")[page.split("/").length-2]) + ".js") & (page.split("/")[page.split("/").length-2]) != "index") {
					page = page + (page.split("/")[page.split("/").length-2]) + ".js";
				} else if (fs.existsSync(path + page + (page.split("/")[page.split("/").length-2]) + ".phjs") & (page.split("/")[page.split("/").length-2]) != "index") {
					page = page + (page.split("/")[page.split("/").length-2]) + ".phjs";
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
			if (fs.existsSync(page)) {
				var content = ProcessPage(page,param,req.method,libs);
				res.writeHead(200, {"Content-Type": "text/html"});
				for (var i=0;i<content.length;i++) {
					res.write(content[i]);
				}
				res.end("");
			} else {
				res.writeHead(404, {"Content-Type": "text/plain"});
				res.end("ERROR 404 : Page not found");
			}
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
	}).listen(port);
}

function ProcessPage(page,param,method,libs) {
	args = { GET: {}, POST: {} };
	if (typeof(param) == "string"){
	  param = param.split("&");
	  for(var i=0;i<param.length;i++) {
		  args[method][param[i].split("=")[0]] = param[i].split("=")[1]
	  }
	}
	
	var file = fs.readFileSync(page, "UTF-8");
	var isphjs = 0;
	var htl = new Array();
	var ht = {};
	for (var i=0;i<file.length;i++) {
		if (file[i]+file[i+1]+file[i+2]+file[i+3]+file[i+4]+file[i+5] == "<?phjs") {
			isphjs = 1;
			if (typeof(ht.debut) != "undefined") {
				ht.fin = i-1;
				htl.push(ht);
			}
			ht = {};
			i += 5;
		} else if (file[i]+file[i+1] == "?>"){
			isphjs = 0;
			ht.debut = i+2;
			i += 1;
		} else if (i == 0) {
			ht.debut = 0;
		} else if (i == file.length-1 & isphjs == 0) {
			ht.fin = file.length-1;
			htl.push(ht);
		}
	}
	var newht;
	var oldlen;
	var dif = 0;
	for (var i=0;i<htl.length;i++) {
		htl[i].debut = htl[i].debut + dif
		htl[i].fin = htl[i].fin + dif
		newht = file.substring(htl[i].debut,htl[i].fin+1);
		oldlen = newht.length;
		newht = remplace(newht,'"',"'");
		newht = remplace(newht,"\n","");
		file = (file.substring(0,htl[i].debut) + ' echo("' + newht + '"); ' + file.substring(htl[i].fin+1,file.length));
		dif += ((' echo("' + newht + '"); ').length - oldlen);
	}
	file = remplace(file,"<?phjs","");
	file = remplace(file,"?>","");
	
	file = "function start(args,echo,content,libs) { " + file + " return content; } module.exports = { start: start };"
	file = rfs(file);
	var content = new Array();
	content = file.start(args,function (chaine) { content.push(chaine + " ") },content,libs);
	return content;
}

function remplace(words,a,b) {
	while (words != words.replace(a,b)) {
		words = words.replace(a,b);
	}
    return words;
}

module.exports = {
	StartServer: StartServer
};