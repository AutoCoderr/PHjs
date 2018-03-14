var rfs = require('require-from-string');
var http = require("http");
var https = require("https");
var fs = require("fs");
var url = require('url');
var formidable = require('formidable');

	
var StartServer = function (path,proto,port,options,libs) {
	if (typeof(path) != "string") {
		var err = new Error("Variable 'path' incorrecte");
		throw err;
	}
	if (typeof(proto) != "string") {
		var err = new Error("Variable 'proto' incorrecte");
		throw err;
	} else if (proto != 'http' & proto != 'https') {
		var err = new Error("Variable 'proto' ni http ni https");
		throw err;
	}
	if (typeof(port) != "string" & typeof(port) != "number") {
		var err = new Error("Variable 'port' incorrecte");
		throw err;
	}
	if (typeof(options) != "object") {
		console.log("si vous êtes en mode http, vous pouvez mettre un object vide '{}' pour cette variable")
		var err = new Error("Variable 'options' incorrecte");
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
	
	var webserver = function(req, res) { // --------------------------> LE SERVEUR WEB <------------------------------------------------------
		var page = url.parse(req.url).pathname;
        var args = {GET: {}, POST: {}};
        if (req.method == "POST") {
            var form = new formidable.IncomingForm();
			form.parse(req, function(err, fields, files) {
			  if (err) {
			    throw err;
			  } else {
				for (var i in fields) {
					args.POST[i] = {content: fields[i], type: "text" };
				}
				for(var i in files) {
					args.POST[i] = {content: files[i], type: "file" };
				}
				if (typeof(ext) != "undefined" & ext == "phjs") {
					lauchphjs();
				}
			  }
			});
        } else if(req.method == "GET") {
			args.GET = getargs(url.parse(req.url).query);
        }

		if (page[page.length-1] == "/") {
			page = page.substring(0,page.length-1);
		}
		if (fs.existsSync(path + page)) {
				if(fs.statSync(path + page).isDirectory()) {
				  var type = "folder";
				  page = page + "/";
				} else {
				  var type = "file";
				}
		} else {
			res.writeHead(404, {"Content-Type": "text/plain"});
			res.end("ERROR 404 : Page not found");
			return;
		}
		if (type == "folder"){
			if (page != "") {
				if (fs.existsSync(path + page + (page.split("/")[page.split("/").length-2]) + ".html") & (page.split("/")[page.split("/").length-2]) != "index") {
					page = page + (page.split("/")[page.split("/").length-2]) + ".html";
					type = "file";
				} else if (fs.existsSync(path + page + (page.split("/")[page.split("/").length-2]) + ".js") & (page.split("/")[page.split("/").length-2]) != "index") {
					page = page + (page.split("/")[page.split("/").length-2]) + ".js";
					type = "file";
				} else if (fs.existsSync(path + page + (page.split("/")[page.split("/").length-2]) + ".phjs") & (page.split("/")[page.split("/").length-2]) != "index") {
					page = page + (page.split("/")[page.split("/").length-2]) + ".phjs";
					type = "file";
				}
            }			
			if (fs.existsSync(path + page + "index.phjs")) {
				page = page + "index.phjs";
				type = "file";
			} else if (fs.existsSync(path + page + "index.html")) {
				page = page + "index.html";
				type = "file";
			} else if (fs.existsSync(path + page + "index.js")) {
				page = page + "index.js";
				type = "file";
			}
		}
		if (type == "folder"){
			fs.readdir(path + page, function(err, items) {
				res.writeHead(200, {"Content-Type": "text/html"});
                                res.write("<meta charset='UTF-8'>");
				if (page != "/") {
					res.write("<a href='..'><font color='grey' size='4'>dossier parent</font></a>");
				}
				res.write("<table>");
				for (var i=0; i<items.length; i++) {
					if (fs.statSync(path + page + items[i]).isDirectory()) {
						res.write("<tr><td>Folder : <a href='" + page + items[i] + "/'>" + items[i] + "</a></td></tr>");
					} else {
						res.write("<tr><td>File : <a href='" + page + items[i] + "'>" + items[i] + "</a></td></tr>");
					}
				}
				res.end("</table>");
			});
			return;
		}
		page = path + page;
		var ext = page.split(".")[page.split(".").length-1]
		if (ext == "mp3") {
			fs.stat(page, function(error,stats) {
				if (error) {
					res.writeHead(500, {"Content-Type": "text/plain"});
					res.end("500 : INTERNAL ERROR");
					console.log("Error at loading of " + page + " : \n " + error);
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
					res.writeHead(500, {"Content-Type": "text/plain"});
					res.end("500 : INTERNAL ERROR");
					console.log("Error at loading of " + page + " : \n " + error);
				} else {
					res.writeHead(200, {"Content-Type": "image/" + ext});
					res.end(content);
				}	
		});
		} else if (ext == "phjs") {
			if (fs.existsSync(page)) {
				if (req.method == "GET") {
					lauchphjs();
				} else if (req.method == "POST") {
					return;
				}
			} else {
				res.writeHead(500, {"Content-Type": "text/plain"});
				res.end("500 : INTERNAL ERROR");
				console.log("Error at loading of " + page + " : \n " + error);
			}
		} else {	
			fs.readFile(page, 'utf-8', function(error, content) {
			  if(error){
				  res.writeHead(500, {"Content-Type": "text/plain"});
				  res.end("500 : INTERNAL ERROR");
				  console.log("Error at loading of " + page + " : \n " + error);
			  } else {
  				  res.writeHead(200, {"Content-Type": "text/html"});
				  res.end(content);
			  }
			});
		}
		function lauchphjs() {
			var content = ProcessPage(page,args,req.method,libs);
			if (content != "ERROR") {
				res.writeHead(200, {"Content-Type": "text/html"});
				for (var i=0;i<content.length;i++) {
					res.write(content[i]);
				}
				res.end("");
			} else {
				res.writeHead(500, {"Content-Type": "text/plain"});
				res.end("500 : INTERNAL ERROR");
			}
		}
	}
	
	if (proto == 'http') {
		http.createServer(webserver).listen(port);
	} else if (proto == 'https') {
		https.createServer(options, webserver).listen(port);
	}
}



function ProcessPage(page,args,method,libs) {
	var file = fs.readFileSync(page, "UTF-8");
	var isphjs = 0;
	var htl = new Array();
	var ht = {};
	for (var i=0;i<file.length;i++) {
		if (file[i]+file[i+1]+file[i+2]+file[i+3]+file[i+4]+file[i+5] == "<?phjs") {
			isphjs = 1;
			if (typeof(ht.debut) != "undefined") {
				ht.fin = i;
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
			ht.fin = file.length;
			htl.push(ht);
		}
	}
	var newht;
	var oldlen;
	var dif = 0;
	for (var i=0;i<htl.length;i++) {
		htl[i].debut = htl[i].debut + dif
		htl[i].fin = htl[i].fin + dif
		newht = file.substring(htl[i].debut,htl[i].fin);
		oldlen = newht.length;
		newht = remplace(newht,"\n","");
		file = (file.substring(0,htl[i].debut) + "\necho(`" + newht + "`); " + file.substring(htl[i].fin,file.length));
		dif += (("\necho(`" + newht + "`); ").length - oldlen);
	}
	file = remplace(file,"<?phjs","");
	file = remplace(file,"?>","");
	
	file = "function start(args,echo,content,libs) { " + file + " \nreturn content; } module.exports = { start: start };"
	try {
		file = rfs(file);
	} catch(e) {
		console.log("Syntax error when process '" + page + "' : \n");
		console.log(e);
		return "ERROR";
	}
	var content = new Array();
	try {
	    content = file.start(args,function (chaine) { content.push(chaine + " \n") },content,libs);
		return content;
	} catch(e) {
		console.log("Execution error when process '" + page + "' : \n");
		console.log(e);
		return "ERROR";
	}
}

function remplace(words,a,b) {
	while (words != words.replace(a,b)) {
		words = words.replace(a,b);
	}
    return words;
}

function getargs(args0) {
	if (typeof(args0) == "string"){
	   args = {};
       args0 = args0.split("&");
       for(var i=0;i<args0.length;i++) {
          args[args0[i].split("=")[0]] = args0[i].split("=")[1];
       }
	   return args;
    } else {
	   return {};
	}
}

module.exports = {
	StartServer: StartServer
};
