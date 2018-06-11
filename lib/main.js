const rfs = require('require-from-string'),
      http = require("http"),
      https = require("https"),
      fs = require("fs-extra"),
      url = require('url'),
      formidable = require('formidable'),
	  rc = require("read-chunk"),
	  ft = require("file-type"),
	  util = require("util"),
	  functionsl = require(__dirname + "/functions.js");

const remplace = functionsl.remplace,
	  genconf = functionsl.genconf,
	  getargs = functionsl.getargs,
	  isAuthorized = functionsl.isAuthorized,
	  RedirectedTo = functionsl.RedirectedTo,
	  asMIME = functionsl.asMIME,
	  getPath = functionsl.getPath,
	  logupload = functionsl.logupload;
	
var StartServer = function (path,proto,port,options,libs,logaccess,logerror,conffile) {
	if (typeof(path) != "string") {
		throw new Error("Variable 'path' incorrecte");
	}
	
	if (typeof(proto) != "string") {
		throw new Error("Variable 'proto' incorrecte");
	} else if (proto != 'http' & proto != 'https') {
		throw new Error("Variable 'proto' ni http ni https");
	}
	
	if (typeof(port) != "string" & typeof(port) != "number") {
		if (proto == 'http') {
			port = 80;
		} else if (proto == 'https') {
			port = 443;
		}
	}
	
	if (typeof(options) != "object") {
		console.log("si vous êtes en mode http, vous pouvez mettre un object vide '{}' pour cette variable")
		throw new Error("Variable 'options' incorrecte");
	}
	
	if (typeof(libs) != "object") {
		console.log("si vous ne voulez pas mettre de modules, vous pouvez mettre un object vide '{}' pour cette variable")
		throw new Error("Variable 'libs' incorrecte");
	}
	
	if (!fs.existsSync(path)) {
		throw new Error("Le chemin '" + path + "' n'existe pas");
	}
	
	if (typeof(port) == 'string') {
		port = parseInt(port);
		if (isNaN(port)) {
			throw new Error("Variable 'port' incorrecte");
		}
	} else if (typeof(port) == "number" & isNaN(port)) {
		throw new Error("Variable 'port' incorrecte");
	}
	
	if (typeof(logaccess) != "string") {
		throw new Error("'logaccess' variable incorrect");
	} else if (!fs.existsSync(logaccess)) {
		fs.writeFile(logaccess, "There is the log file : \n", function(err) {
			if(err) {
				throw err;
			}
		}); 
	} else if(fs.statSync(logaccess).isDirectory()) {
		throw new Error("'logaccess' : '" + logaccess + "' is a directory");
	}
	
	if (typeof(logerror) != "string") {
		throw new Error("'logerror' variable incorrect");
	} else if (!fs.existsSync(logerror)) {
		fs.writeFile(logerror, "There is the error log file : \n", function(err) {
			if(err) {
				throw err;
			}
		}); 
	} else if(fs.statSync(logerror).isDirectory()) {
		throw new Error("'logerror' : '" + logerror + "' is a directory");
	}
	
	if (typeof(conffile) != "string") {
		throw new Error("'conffile' variable incorrect");
	} else if (conffile == "nothing"){
		var conf = {allow: [], forbidden: [], redirect: [], options: []};
	} else if (!fs.existsSync(conffile)) {
		throw new Error("'" + conffile + "' not exist"); 
	} else if(fs.statSync(conffile).isDirectory()) {
		throw new Error("'" + conffile + "' is a directory");
	}
	
	if (conffile != "nothing") {
		var conf = genconf(conffile);
	} else {
		var conf = {allow: [], forbidden: [], redirect: [], options: [], fastupload: {active: "NO"}};
	}
	
	/*console.log(conf);
	console.log("")
	
	for (var i=0;i<conf.options.length;i++){
		console.log(conf.options[i].options);
	}*/
	
	console.log("log files : \naccess: " + logaccess + "\nerrors: " + logerror + "\n\nconffile:\n  " + conffile);
	
	if (path[path.length-1] == "/") {
			path = path.substring(0,path.length-1);
	}
	
	var webserver = function(req, res) { // --------------------------> LE SERVEUR WEB <------------------------------------------------------
	    var redirected;
		var page = url.parse(req.url).pathname;
        var args = {GET: {}, POST: {}};
        if (req.method == "POST") { // IF POST METHOD, DOWNLOADS FILES AND ARGURMENTS AND PUT IT IN THE 'ARGS' VARIABLE IN ASYNCHRONOUS FUNCTION
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
				if (typeof(ext) != "undefined" & ext == "phjs") { // IF FILE IS PHJS, START LAUCHEPHJS()
					lauchphjs();
				} else { // ELSE IF NOT PHJS, DELETE DOWNLOADEDS FILES
					for (var i in files) {
					  fs.remove(files[i].path, function(err) {
						if (err) {
							console.log("Error when delete '" + files[i].path + "' : ");
							console.log(err);
						}
					  });
					}
				}
			  }
			});
        } else if(req.method == "GET") { // IF GET METHOD, PUT ARGUMENTS IN THE 'ARGS' VARIABLE
			args.GET = getargs(url.parse(req.url).query);
        }
		if (page[page.length-1] == "/") {
			page = page.substring(0,page.length-1);
		}
		if (fs.existsSync(path + page)) { // IF PATH EXISTS, SET THE TYPE ('FOLDER' OR 'FILE')
				if(fs.statSync(path + page).isDirectory()) {
				  var type = "folder";
				  page = page + "/";
				} else {
				  var type = "file";
				  if (!isAuthorized(page,conf,type)) {
					  res.writeHead(403, {"Content-Type": "text/plain"});
					  res.end("ERROR 403 : ACCESS FORBIDDEN");
					  log(403,'INFO',"ACCESS FORBIDDEN");
					  return;
				  }
				  redirected = RedirectedTo(page,conf,type);
				  if (redirected != false & redirected != "undefined") {
					  res.writeHead(301, {"Location": redirected});
					  res.end();
					  log(301,'INFO',"REDIRECTED TO " + redirected);
					  return;
				  }
				}
		} else {
			if (page == "/icons/folder.gif" //IF PATH DOES NOT EXIST BUT IT IS AN ICON GIF IN THIS LIST, SEND IT
  			  | page == "/icons/unknown.gif" 
			  | page == "/icons/image.gif" 
			  | page == "/icons/text.gif"
			  | page == "/icons/binary.gif"
			  | page == "/icons/compressed.gif") {
				fs.readFile(__dirname + "/.." + page, function(error, content) {
					if(error){
						res.writeHead(500, {"Content-Type": "text/plain"});
						res.end("500 : INTERNAL ERROR");
						log(500,'ERROR',"\nError at loading of " + page + " : \n" + util.format(error));
					} else {
						res.writeHead(200, {"Content-Type": "image/gif"});
						res.end(content);
						log(200,'INFO',"");
					}
				});
				return;
			} else if (page == "/socket.io.js"
			         | page == "/fastupload.js"
					 | page == "/jquery.js") {
				fs.readFile(__dirname + "/../libclient" + page, function(error, content) {
					if(error){
						res.writeHead(500, {"Content-Type": "text/plain"});
						res.end("500 : INTERNAL ERROR");
						log(500,'ERROR',"\nError at loading of " + page + " : \n" + util.format(error));
					} else {
						res.writeHead(200, {"Content-Type": "application/javascript"});
						res.end(content);
						log(200,'INFO',"");
					}	
				});
				return;
				
			} else { // ELSE IF NOT EXISTS, SEND 404 ERROR
				res.writeHead(404, {"Content-Type": "text/plain"});
				res.end("ERROR 404 : Page not found");
				log(404,'INFO',"PAGE NOT FOUND");
				return;
			}
		}
		
		/*if (isAuthorized(page,conf,type)) {
			console.log(page + " : Autorisé");
		} else {
			console.log(page + " : Interdit");
		}
		var redirected = RedirectedTo(page,conf,type)
		if (redirected != false) {
			console.log("redirect to => " + redirected);         //DEBUG TO SEE IF FUNCTIONS WORKING
		} else {
			console.log("no redirect");
		}
		if (type == "file") {
			var MIME = asMIME(page,conf);
			if (MIME != false) {
				console.log("change MIME : " + MIME);
			} else {
				console.log("no change MIME")
			}
		}*/
		
		if (type == "folder"){ // IF TYPE IS 'FOLDER', SEARCH AN INDEX OR AN FILE WITH THE NAME OF FOLDER
			if (page != "/") {
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
		if (type == "folder"){ // IF WE DO NOT FOUND AN INDEX OR OTHER FILES IN FOLDER, LISTING ALL FILES AND FOLDERS IN IT AND RETURN
		    if (!isAuthorized(page,conf,type)) {
				res.writeHead(403, {"Content-Type": "text/plain"});
				res.end("ERROR 403 : ACCESS FORBIDDEN");
				log(403,'INFO',"ACCESS FORBIDDEN");
				return;
			}
			redirected = RedirectedTo(page,conf,type);
			if (redirected != false & redirected != "undefined") {
				res.writeHead(301, {"Location": redirected});
				res.end();
				log(301,'INFO',"REDIRECTED TO " + redirected);
				return;
			}
			fs.readdir(path + page, function(err, items) {
				if (err) {
					log(500,'ERROR',"\nError when listing '" + path.page + "'\n" + util.format(err));
					return;
				}
				res.writeHead(200, {"Content-Type": "text/html"});
                res.write("<meta charset='UTF-8'>");
				if (page != "/") {
					res.write("<a href='..'><font color='grey' size='4'>dossier parent</font></a>");
				}
				res.write("<table>");
				var ext;
				for (var i=0; i<items.length; i++) {
					if (fs.statSync(path + page + items[i]).isDirectory()) {
						res.write("<tr><td><img src='/icons/folder.gif'></td><td><a href='" + page + items[i] + "/'>" + items[i] + "</a></td></tr>");
					} else {
						ext = items[i].split(".")[items[i].split(".").length-1];
						if (ext == "png" | ext == "jpg" | ext == "gif" | ext == "jpeg" | ext == "bmp" | ext == "tif" | ext == "tiff") {
							res.write("<tr><td><img src='/icons/image.gif'></td>");
						} else if (ext == "gz" | ext == "tar" | ext == "zip" | ext == "rar" | ext == "7z") {
							res.write("<tr><td><img src='/icons/compressed.gif'></td>");
						} else if (ext == "txt" | ext == "log") {
							res.write("<tr><td><img src='/icons/text.gif'></td>");
						} else if (ext == "exe" | ext == "dll" | ext == "so") {
							res.write("<tr><td><img src='/icons/binary.gif'></td>");
						} else {
							res.write("<tr><td><img src='/icons/unknown.gif'></td>");
						}					
						res.write("<td><a href='" + page + items[i] + "'>" + items[i] + "</a></td></tr>");
					}
				}			
				res.end("</table>");
				log(200,'INFO',"");
			});
			return;
		}
		if (!isAuthorized(page,conf,type)) {
			res.writeHead(403, {"Content-Type": "text/plain"});
			res.end("ERROR 403 : ACCESS FORBIDDEN");
			log(403,'INFO',"ACCESS FORBIDDEN");
			return;
		}
		redirected = RedirectedTo(page,conf,type);
		if (redirected != false & redirected != "undefined") {
			res.writeHead(301, {"Location": redirected});
			res.end();
			log(301,'INFO',"REDIRECTED TO " + redirected);
			return;
		}
		var mime = {mime: asMIME(page,conf)} // GET MIME DECIDED FOR THIS FILE IN CONFIG
		//console.log(mime);
		page = path + page;
		if (mime.mime == false) { // IF NO MIME DECIDED
			var mime = ft(rc.sync(page,0,100)); // GET MIME TYPE OF THE FILE
			//console.log(mime);
		}
		if (mime == null) { // IF NO MIME FOUND
			var ext = page.split(".")[page.split(".").length-1];
			if (ext == "phjs") { // IF FILE IS PHJS, START EXECUTING IT WITH LAUNCHPHJS()
				if (req.method == "GET") {
					lauchphjs();
				} else if (req.method == "POST") { // IF METHOD IS POST, RETURN AND WAIT FOR THE ASYNCHRONOUS FUNCTION TO START LAUCHPHJS()
					return;
				}
			} else { // ELSE IF IS NOT PHJS, SEND FILE HAS HTML
				fs.readFile(page, 'utf-8', function(error, content) {
					if(error){
						res.writeHead(500, {"Content-Type": "text/plain"});
						res.end("500 : INTERNAL ERROR");
						log(500,'ERROR',"\nError at loading of " + page + " : \n" + util.format(error));
					} else {
						res.writeHead(200, {"Content-Type": "text/html"});
						res.end(content);
						log(200,'INFO',"");
					}
				});
			}
		} else { // IF MIME FOUND
			mime = mime.mime;
			//console.log(mime);
			if (mime.replace("/","") != mime & mime.split("/")[0] == "audio") { // IF FILE IS AUDIO
				fs.stat(page, function(error,stats) {
					if (error) {
						res.writeHead(500, {"Content-Type": "text/plain"});
						res.end("500 : INTERNAL ERROR");
						log(500,'ERROR',"\nError at loading of " + page + " : \n" + util.format(error));
					} else {
						res.writeHead(200, {
						'Content-Type': 'audio/' + mime.split("/")[mime.split("/").length-1],
						'Content-Length': stats.size
						});
						log(200,'INFO',"");
						fs.createReadStream(page).pipe(res);
					}	
				});
			} else if (mime.replace("/","") != mime & mime.split("/")[0] == "video") { //IF FILE IS VIDEO
				fs.stat(page, function(error, stats) {
					if (error) {
						res.writeHead(500, {"Content-Type": "text/plain"});
						res.end("500 : INTERNAL ERROR");
						log(500,'ERROR',"\nError at loading of " + page + " : \n" + util.format(error));
						return;
					}
					log(200,'INFO',"");
					var range = req.headers.range;
					var total = stats.size;
					if (!range | typeof(range) == "undefined") {
						res.writeHead(200, {
							"Content-Length": total,
							"Content-Type": "video/" + mime.split("/")[mime.split("/").length-1]
						});
						fs.createReadStream(page).pipe(res);
						return;
					}
					var positions = remplace(range,"bytes=", "").split("-");
					var start = parseInt(positions[0], 10);
					var end = positions[1] ? parseInt(positions[1], 10) : total - 1;
					var chunksize = (end - start) + 1;
	
					res.writeHead(206, {
						"Content-Range": "bytes " + start + "-" + end + "/" + total,
						"Accept-Ranges": "bytes",
						"Content-Length": chunksize,
						"Content-Type": "video/" + mime.split("/")[mime.split("/").length-1]
					});
	
					var stream = fs.createReadStream(page, { start: start, end: end })
					.on("open", function() {
						stream.pipe(res);
					})
					.on("error", function(err) {
						res.end(err);
					});
				});
			} else if (mime == "phjs" | mime == "PHJS") { //IF MIME DECIDED IS PHJS, START AS PHJS
				if (req.method == "GET") {
					lauchphjs();
				} else if (req.method == "POST") { // IF METHOD IS POST, RETURN AND WAIT FOR THE ASYNCHRONOUS FUNCTION TO START LAUCHPHJS()
					return;
				}
			} else { // IF FILE IS IMAGE OR OTHER
				fs.readFile(page, function(error, content) {
					if(error != null | mime.replace("/","") == mime){
						//console.log("image or other --> error \nerror : " + util.format(error));
						res.writeHead(500, {"Content-Type": "text/plain"});
						res.end("500 : INTERNAL ERROR");
						log(500,'ERROR',"\nError at loading of " + page + " : \n" + util.format(error));
					} else {
						//console.log("image or other --> success");
						res.writeHead(200, {"Content-Type": mime.split("/")[0] + "/" + mime.split("/")[mime.split("/").length-1]});
						res.end(content);
						log(200,'INFO',"");
					}	
				});	
			}
		}
		function lauchphjs() { // START PHJS
			var content = ProcessPage(page,args,libs); // START FUNCTION TO PROCESS HTML PAGE FROM PHJS, AND PUT THE RESULT IN 'CONTENT' VARIABLE
			if (content != "ERROR") { // IF THERE IS NOT ERROR
				res.writeHead(200, {"Content-Type": "text/html"});
				for (var i=0;i<content.length;i++) {
					res.write(content[i]);
				}
				res.end("");
				log(200,'INFO',"");
			} else { // IF THERE IS ERROR
				res.writeHead(500, {"Content-Type": "text/plain"});
				res.end("500 : INTERNAL ERROR");
			}
		}
		
		function ProcessPage(page,args,libs) { // FUNCTION TO PROCESS HTML PAGE FROM PHJS
			var file = fs.readFileSync(page, "UTF-8");
			var isphjs = 0;
			var htl = new Array();
			var ht = {};
			for (var i=0;i<file.length;i++) { // LOCATE NON PHJS CODE IN THE FILE
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
			for (var i=0;i<htl.length;i++) { // PUT ALL NON PHJS CODE IN 'ECHO' FUNCTION, 'ECHO' FUNCTION IS LIKE 'ECHO' IN PHP, TO GENERATE THE HTML PAGE
				htl[i].debut = htl[i].debut + dif
				htl[i].fin = htl[i].fin + dif
				newht = file.substring(htl[i].debut,htl[i].fin);
				file = (file.substring(0,htl[i].debut) + "\necho(`" + newht + "`); " + file.substring(htl[i].fin,file.length));
				dif += (("\necho(`" + newht + "`); ").length - newht.length);
			}
			file = remplace(file,"<?phjs",""); // DROP PHJS TAGS FROM FILE
			file = remplace(file,"?>","");
			
			file = "function start(args,echo,content,libs,cd) { var print = echo; \n" + file + " \nreturn content; } module.exports = { start: start };" // PUT FILE IN A FUNCTION FOR EXECUTE HIS JAVASCRIPT CODE
			try {
				file = rfs(file); //TRY IMPORT FILE
			} catch(e) {
				log(500,'ERROR',"\nSyntax error when process '" + page + "' : \n" + util.format(e));
				return "ERROR";
			}
			var content = new Array();
			try { 
				content = file.start(args,function (chaine) { content.push(chaine + " \n") },content,libs,getPath(page)); // TRY EXECUTE FILE, PUT RESULT IN 'CONTENT' VARIABLE, AND RETURN IT
				return content;
			} catch(e) {
				log(500,'ERROR',"\nExecution error when process '" + page + "' : \n" + util.format(e));
				return "ERROR";
			}
		}

		function log(code,type,msg,err) {
			var date = new Date();
			var dst;
			var logfile;
			if (type == "INFO") {
				logfile = logaccess;
			} else if (type == "ERROR") {
				logfile = logerror;
			}
			dst = proto + "://" + req.headers.host + url.parse(req.url).pathname;
			if (req.method == "GET" & url.parse(req.url).query != null) {
				dst = dst + "?" + url.parse(req.url).query;
			}
			fs.appendFileSync(logfile, 
			(date.getFullYear() + '/' + (date.getMonth()+1) + '/' + date.getDate() + "  " + date.getHours() + ':' + date.getMinutes() + ':' + date.getSeconds() + ' => ' + remplace(req.connection.remoteAddress,'::ffff:','') + ' => ' + req.method + ' ' + dst + ' CODE ' + code + ' ; ' + req.headers['user-agent'] + ' ' + msg + '\n')); 
		}

	}
	
	if (proto == 'http') {
		var server = http.createServer(webserver);
	} else if (proto == 'https') {
		var server = https.createServer(options, webserver);
	}
	server.listen(port)
	if (conf.fastupload.active == "YES") {
		if (fs.existsSync(path + conf.fastupload.folder)) {
			console.log("\nStart FastUpload server on '" + path + conf.fastupload.folder + "'")
			var io = require('socket.io').listen(server);
			io.sockets.on('connection', function (socket) {
				//console.log("socket.io connected!");
				socket.downloaded = 0;
				socket.data = "";
				socket.handler = 0;
				socket.on('Upload', function (data){ // --------------------------------> UPLOAD D'UN FICHIER <---------------------------------------------------------)
					if (typeof(data) != "object") {
						socket.emit('repupload', { type: 'refused', raison: 'Incorrect variable'});
						logupload(remplace(socket.handshake.address,"::ffff:",""),data.name,"Incorrect variable",logerror);
					} else { 
						if (typeof(data.name) != "string" | typeof(data.size) != "number" | typeof(data.data) != "string") {
							socket.emit('repupload', { type: 'refused', raison: 'Error: incorrect variable'});
							if (typeof(data.name) == "string") {
								logupload(remplace(socket.handshake.address,"::ffff:",""),data.name,"Incorrect variable",logerror);
							} else {
								logupload(remplace(socket.handshake.address,"::ffff:",""),"filename not found","Incorrect variable",logerror);
							}
						} else {
							if (socket.handler == 0) {
								if(data.size >= conf.fastupload.maxsize) {
									socket.emit('repupload', {type: 'refused', raison: 'The file is too big'});
									logupload(remplace(socket.handshake.address,"::ffff:",""),data.name,"The file is too big",logerror);
								} else {
									data.ext = data.name.split(".")[data.name.split(".").length-1];
									//if (data.ext == "jpg" | data.ext == "png" | data.ext == "bmp" | data.ext == "jpeg" | data.ext == "gif" | data.ext == "tif" | data.ext == "tiff"){
										data.num = 1;
										while (fs.existsSync(path + conf.fastupload.folder + "/" + data.name.split(".")[0] + "-n" + data.num + "." + data.ext)) {
											data.num += 1;
										}
										socket.filename = data.name.split(".")[0] + "-n" + data.num + "." + data.ext
										socket.handler = fs.openSync(path + conf.fastupload.folder + "/" + socket.filename, 'a')
									/*} else {
										socket.emit('repupload', { type: 'refused', raison: "Ce n'est pas une image" });
										log(socket.pseudo,"Envoyer une image","Ce n'est pas une image",remplace(socket.handshake.address,"::ffff:",""));
									}*/
								}
							}
							if (socket.handler != 0) {
								if(data.size >= conf.fastupload.maxsize) {
									socket.emit('repupload', {type: 'refused', raison: 'The file is too big'});
								} else {
									socket.downloaded += data.data.length;
									socket.data += data.data;
									if(socket.downloaded >= data.size) { //If File is Fully Uploaded
										fs.write(socket.handler, socket.data, null, 'Binary', function(err, Writen){
											socket.emit('repupload', {'type': 'finish'});
											logupload(remplace(socket.handshake.address,"::ffff:",""),socket.filename,"File succefuly uploaded",logaccess);
											socket.handler = 0;
											socket.downloaded = 0;
											socket.filename = "";
											socket.data = "";
											//console.log("if 1");
										});
									} else if(socket.data.length > 1048576){ //If the Data Buffer reaches 10MB
										fs.write(socket.handler, socket.data, null, 'Binary', function(err, Writen){
											socket.data = ""; //Reset The Buffer
											socket.emit('repupload', { 'type': 'progress'
												      , 'place' :    socket.downloaded
												      , 'percent' :  (socket.downloaded / data.size) * 100});
										});
									} else {
										socket.emit('repupload', { 'type': 'progress'
												                 , 'place' :    socket.downloaded
												                 , 'percent' :  (socket.downloaded / data.size) * 100});
										//console.log("if 3");
										//console.log(socket.downloaded);
									}
								}  
							}
						}
					}
				});
			});
		} else {
			console.log("\n'" + conf.fastupload.folder + "' does not exist for FastUpload");
		}
	}
}

module.exports = StartServer;
