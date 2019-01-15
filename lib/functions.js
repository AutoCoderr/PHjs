const fs = require("fs-extra"),
	  rfs = require('require-from-string');





// --------- GENERATE CONF FROM CONFIGURATION FILE ------------

function genconf(conffile) { // read config file and create a variable from this

	var confstr = fs.readFileSync(conffile, "UTF-8"); // String of config file

	var conf = {allow: [], forbidden: [], redirect: [], options: [], fastupload: {active: "NO", forbidden: [], allow: []}}; // Object variable will contain config

	var b;

	var nextword;

	var nextwordB;

	var last;

	var lastO;

	var target;

	var i = 0;

	while (i<confstr.length) {

		nextword = getnextword();

		if (equal(nextword,"forbidden") | equal(nextword,"allow")) {

			//console.log(nextword);

			if (confstr[i] != ':') {

				throw new Error("Please put ':' after '" + nextword + "'");

			} else if (i == confstr.length-1) {

				throw new Error("Incomplete file");

			}

			b = 1;

			while (b == 1) {

				nextwordB = getnextword();

				if (nextwordB[nextwordB.length-1] == "/") {

					nextwordB = nextwordB.substring(0,nextwordB.length-1);

				}

				conf[toMin(nextword)].push(nextwordB);

                if (isnextword(";")) {

					b = 0;

				} else if (!isnextword(",")) {

					throw new Error("Incomplete file");

				}

			}

		} else if (equal(nextword,"redirect")){

			//console.log("redirect");

			if (confstr[i] != ':') {

				throw new Error("Please put ':' after '" + nextword + "'");

			} else if (i == confstr.length-1) {

				throw new Error("Incomplete file");

			}

			b = 1;

			while (b == 1) {

				i += 1;

				nextwordB = getnextword([":"])

				if (nextwordB[nextwordB.length-1] == "/") {

					nextwordB = nextwordB.substring(0,nextwordB.length-1);

				}

				conf.redirect.push({elem: nextwordB});

				if (isnextword("to")) {

					last = conf.redirect.length-1;

					conf.redirect[last].redirect = getnextword([":"]);

					if (isnextword(";")) {

						b = 0;

					} else if (!isnextword(",")) {

						throw new Error("Incomplete file");

					}

				} else {

					throw new Error("Incomplete file");

				}

			}

		} else if (equal(nextword,"fastupload")) {

			if (confstr[i] != ':') {

				throw new Error("Please put ':' after '" + nextword + "'");

			} else if (i == confstr.length-1) {

				throw new Error("Incomplete file");

			}

			b = 1

			while (b == 1) {

				nextword = getnextword();

				if (equal(nextword,"maxsize")) {

					if (typeof(conf.fastupload.maxsize) != "undefined") {

						throw new Error("Maxsize is already defined for FastUpload");

					}

					nextwordB = getnextword();

					if (nextwordB != "NaN" & nextwordB == parseInt(nextwordB).toString()) {

						conf.fastupload.maxsize = nextwordB;

					} else {

						throw new Error("'" + nexwordB + "' is not a valid number for maxsize");

					}

				} else if (equal(nextword,"finish")) {
					if (typeof(conf.fastupload.finish) != "undefined") {

						throw new Error("Finish function is already defined for FastUpload");

					}

					nextwordB = getnextword();

					if(fs.existsSync(nextwordB)) {
						if (!fs.statSync(nextwordB).isDirectory()) {
							conf.fastupload.finish = nextwordB;
						} else {
							throw new Error("'"+nextwordB+"' is a directory");
						}
					} else {
						throw new Error("'"+nextwordB+"' does not exist");
					}

				} else if (equal(nextword,"forbidden")) {
					if (conf.fastupload.forbidden.length > 0) {

						throw new Error("Forbidden files names are already defined for FastUpload");

					}
					conf.fastupload.forbidden = [];

					nextwordB = getnextword();
					conf.fastupload.forbidden.push(nextwordB);

					while(isnextword(",")) {
						nextwordB = getnextword();
						conf.fastupload.forbidden.push(nextwordB);
					}

				} else if (equal(nextword,"allow")) {
					if (conf.fastupload.allow.length > 0) {

						throw new Error("Allowed files names are already defined for FastUpload");

					}
					conf.fastupload.allow = [];

					nextwordB = getnextword();
					conf.fastupload.allow.push(nextwordB);

					while(isnextword(",")) {
						nextwordB = getnextword();
						conf.fastupload.allow.push(nextwordB);
					}

				} else if (isnextword(";")) {

					if (typeof(conf.fastupload.maxsize) != "undefined" & typeof(conf.fastupload.finish) != "undefined") {

						conf.fastupload.active = "YES";

						b = 0;

					} else {

						throw new Error("FastUpload not correctly configured");

					}

				} else {

					throw new Error("Incomplete file");

				}

			}

	    } else {

			i -= nextword.length;

			if (isnextword('option(')) {

				//console.log("options");

				target = getnextword();

				if (target[target.length-1] == "/") {

					target = target.substring(0,target.length-1);

				}

				if (confstr[i] != ")") {

					throw new Error("Please put ')' after 'option(" + target + "'");

				} else if (i == confstr.length-1) {

					throw new Error("Incomplete file");

				}

				i += 1;

				if (confstr[i] != ":") {

					throw new Error("Please put ':' after 'option(" + target + ")'");

				} else if (i == confstr.length-1) {

					throw new Error("Incomplete file");

				}

				i += 1;

				conf.options.push({});

				last = conf.options.length-1;

				conf.options[last].target = removeLastSlash(target);

				conf.options[last].options = [];

				b = 1;

				while (b == 1){

					if (i>=confstr.length) {

						throw new Error("Incomplete file");

					}

					if (isnextword('file')) {

						conf.options[last].options.push({file: getnextword()});

						nextword = getnextword();

						if (equal(nextword,"as") | equal(nextword,"is") | equal(nextword,"redirect")) {

							//console.log("options/options");

							lastO = conf.options[last].options.length-1;

							conf.options[last].options[lastO].type = toMin(nextword);

							nextword = getnextword([":"]);

							conf.options[last].options[lastO].val = nextword;

							if (isnextword(";")) {

								b = 0;

							} else if (!isnextword(",")) {

								throw new Error("Please put ',' or ';' after '" + nextword + "'");

							}

						} else {

							throw new Error("Incomplete file");

						}

					} else {

						throw new Error("Incomplete file");

					}

				}

				if (isnextword("recursive")) {

					nextword = getnextword();

					if (equal(nextword,"yes") | equal(nextword,"no")) {

						conf.options[last].recursive = toMin(nextword);

					} else {

						throw new Error("Please put 'yes' or 'no' after 'recursive'");

					}

				} else {

					conf.options[last].recursive = "no";

				}

			} else if (getnextword() == "") {

				i = confstr.length;

			} else {

				throw new Error("Incomplete file");

			}

		}

	}

	return conf;

    

	function isnextword(word) {

	   var isword;

	   for (var j=i;j<confstr.length;j++) {

		   if (confstr[j] != " " & confstr[j] != "\n" & confstr[j] != "\r" & confstr[j] != "" ) {

			   isword = true;

			   for(var k=0;k<word.length;k++) {

				   if (j+k >= confstr.length) {

					   isword = false;

					   break;

				   } else if (toMin(confstr[j+k]) != word[k]) {

					   isword = false;

					   break;

				   }

			   }

			   if (isword == true) {

				   i = j+word.length;

				   if (i>=confstr.length & word != ";") {

					throw new Error("Incomplete file");

				   }

			   }

			   j = confstr.length;

		   }

		   if (j >= confstr.length-1) {

			   isword == false;

		   }

	   }

	   if (isword != true & isword != false) {

		   isword = false;

	   }

	   return isword;

    }

	function getnextword(noskip) {

	   if (!Array.isArray(noskip)) {

		   noskip = [];

	   }

	   var toskip = [" ","\n","\r",",",";",":","(",")"];

	   var nextword = "";

	   for (var j=i;j<confstr.length;j++) {

	   	  if (confstr[j] == "'" | confstr[j] == '"'){
		   		var delimiter = confstr[j];
		   		j += 1;
		   		while(confstr[j] != delimiter) {
		   			nextword += confstr[j];
		   			j += 1;
		   		}

		   		i = j+1;

		   		if (i>=confstr.length & nextword != ";" & !equal(nextword,"yes") & !equal(nextword,"no")) {

					throw new Error("Incomplete file");

			   	}

			   	break;

		   } else if (isok(confstr[j])) {
			   while(isok(confstr[j]) & j<confstr.length) {
				   nextword += confstr[j];
				   j += 1;
			   }

			   i = j;

			   if (i>=confstr.length & nextword != ";" & !equal(nextword,"yes") & !equal(nextword,"no")) {
					throw new Error("Incomplete file");
			   }

			   break;

		   }

	   }

	   return nextword;

	   function isok(char){

		   var out = true;

		   for (var k=0;k<toskip.length;k++) {

			   if (toskip[k] == char) {

				   out = false;

				   k = toskip.length;

			   }

		   }

		   if (out == false) {

			   for (var k=0;k<noskip.length;k++) {

				   if (noskip[k] == char) {

					   out = true;

					   k = noskip.length;

				   }

			   }

		   }

		   return out

	   }

    }

}

function equal(A,B) {
	return (toMin(A) == toMin(B) ? true : false);
}

function toMin(str) {
	var alphapetMin = ["a","b","c","d","e","f","h","i","j","k","l","m","n","o","p","q","r","s","t","u","v","w","x","y","z"];
	var alphapetMaj = ["A","B","C","D","E","F","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z"];

	for(var i=0;i<alphapetMin.length;i++) {
		str = remplace(str,alphapetMaj[i],alphapetMin[i]);
	}
	return str;
}


function removeLastSlash(path) {

	if (path[path.length-1] == "/") {

		return path.substring(0,path.length-1);

	} else {

		return path;

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



function asMIME(file,conf) {

	for (var i=0;i<conf.options.length;i++) {

		if ((conf.options[i].recursive == "yes" & isInRep(conf.options[i].target,getPath(file)))

		  | (conf.options[i].recursive == "no" & conf.options[i].target == getPath(file))) {

			for (var j=0;j<conf.options[i].options.length;j++) {

				if (FileInModel(getFileName(file),conf.options[i].options[j].file) == true & conf.options[i].options[j].type == "as") {

					return conf.options[i].options[j].val;

				}

			}

			return false;

		}

	}

	return false;

}



function RedirectedTo(target,conf,type) {

	if (type == "file") {

		var redirect = repRedirectedto(getPath(target));

		if (redirect == false) {

			redirect = fileRedirectedto(target);

		}

		return redirect;

	} else if (type == "folder") {

		//console.log("redirect to " + repRedirectedto(getPath(target)));

		return repRedirectedto(getPath(target));

	}

	function repRedirectedto(path) {

		var out = false;

		var subrep = 0;

		for (var i=0;i<conf.redirect.length;i++) {

			if(isInRep(conf.redirect[i].elem,path) == true & getNumberSubRep(conf.redirect[i].elem) > subrep) {

				out = conf.redirect[i].redirect;

				subrep = getNumberSubRep(conf.redirect[i].elem);

			}

		}

		return out;

	}

	

	function fileRedirectedto(file) {

		for (var i=0;i<conf.options.length;i++) {

			if ((conf.options[i].recursive == "yes" & isInRep(conf.options[i].target,getPath(file)))

			  | (conf.options[i].recursive == "no" & conf.options[i].target == getPath(file))) {

				for (var j=0;j<conf.options[i].options.length;j++) {

					if (FileInModel(getFileName(file),conf.options[i].options[j].file) == true & conf.options[i].options[j].type == "redirect") {

						return conf.options[i].options[j].val;

					}

				}

				return false;

			}

		}

		return false;

	}

}



function isAuthorized(target,conf,type) {

	if (type == "file") {

		//console.log("repautorized (type file)");

		if (!repIsAuthorized(getPath(target))) {

			return false;

		}

		if (!fileIsAuthorized(target)) {

			return false;

		}

		return true;

	} else if (type == "folder") {

		//console.log("repautorized (type folder)");

		if (!repIsAuthorized(target)) {

			return false;

		}

		return true;

	}

	

	function repIsAuthorized(path) {

		path = removeLastSlash(path);

		var out;

		var subrep = 0;

		var param = "forbidden";

		while(repIsInParam()) {

			//console.log("repisparam while : " + subrep)

			if (param == "forbidden") {

				param = "allow";

			} else if (param == "allow") {

				param = "forbidden";

			}

		}

		//console.log("finish : " + param);

		if (param == "forbidden") {

			return true;

		} else if (param == "allow") {

			return false;

		}

		

		function repIsInParam() {

			if (typeof(conf[param]) == "undefined") {

				subrep = 0;

				return false;

			}

			for (var j=0;j<conf[param].length;j++) {

				if (isInRep(conf[param][j],path) == true & getNumberSubRep(conf[param][j]) > subrep) {

					//console.log("isinrep(" + conf[param][j] + "," + path + ")")

					subrep = getNumberSubRep(conf[param][j]);

					return true;

				}

			}

			return false;

		}

		

	}	

	function fileIsAuthorized(file) {

		var out = true;

		for (var i=0;i<conf.options.length;i++) {

			if ((conf.options[i].recursive == "yes" & isInRep(conf.options[i].target,getPath(file)))

			  | (conf.options[i].recursive == "no" & conf.options[i].target == getPath(file))) {

				//console.log(conf.options[i].recursive + " | " + conf.options[i].target + " => " + getPath(file));

				out = false;

				for (var j=0;j<conf.options[i].options.length;j++) {

					if (FileInModel(getFileName(file),conf.options[i].options[j].file) == true & conf.options[i].options[j].type == "is" & conf.options[i].options[j].val == "allow") {

						out = true;

						j = conf.options[i].options.length;

					}

				}

				if (out == false) {

					out = true;

					for (var j=0;j<conf.options[i].options.length;j++) {

						if (FileInModel(getFileName(file),conf.options[i].options[j].file) == true & conf.options[i].options[j].type == "is" & conf.options[i].options[j].val == "forbidden") {

							out = false;

							j = conf.options[i].options.length;

						}

					}

				}

				i = conf.options.length;

			}

		}

		return out;

	}

}



function getNumberSubRep(path) {

	return path.split("/").length;

}

function canUpload(filename,conf) {
	var allow = true;
	for (var i=0;i<conf.fastupload.forbidden.length;i++) {
		if (FileInModel(filename,conf.fastupload.forbidden[i])) {
			allow = false;
			break;
		}
	}
	if (allow == false) {
		for (var i=0;i<conf.fastupload.allow.length;i++) {
			if (FileInModel(filename,conf.fastupload.allow[i])) {
				allow = true;
				break;
			}
		}
	}
	return allow;
}



function FileInModel(filename,model) {

	if (model == "*") {

		return true;

	} else if (model.replace("*","") == model) {

		if (filename == model) {

			return true;

		} else {

			return false;

		}

	} else if (model[0] == "*" & model[model.length-1] == "*") {

		if (remplace(filename,remplace(model,"*",""),"") != filename) {

			return true;

		} else {

			return false;

		}

	} else if (model[0] != "*" & model[model.length-1] == "*") {

		if (filename.substring(0,remplace(model,"*","").length) == remplace(model,"*","")) {

			return true;

		} else {

			return false;

		}

	} else if (model[0] == "*" & model[model.length-1] != "*") {

		if (filename.substring(filename.length-remplace(model,"*","").length,filename.length) == remplace(model,"*","")) {

			return true;

		} else {

			return false;

		}

	}

}



function getFileName(file) {

	return file.split("/")[file.split("/").length-1];

}



function isInRep(rep,inside) {

	var Prep = "";

	var insideSplit = inside.split("/");

	for (var i=0;i<insideSplit.length;i++) {

		Prep += insideSplit[i] + "/";

		if (Prep.substring(0,Prep.length-1) == rep) {

			return true;

		}

	}

	return false;

}

function getPath(target) {

	var path = "";

	var targetsplit = target.split("/");

	for (var i=0;i<targetsplit.length-1;i++) {

		path += targetsplit[i] + "/";

	}

	path = path.substring(0,path.length-1);

	return path;

}

function getFileName(target) {
	return target.split("/")[target.split("/").length-1];
}



function logupload(ipsrc,filename,msg,logfile) {

	var date = new Date();

	var logfile;

	fs.appendFileSync(logfile, 

	(date.getFullYear() + '/' + (date.getMonth()+1) + '/' + date.getDate() + "  " + date.getHours() + ':' + date.getMinutes() + ':' + date.getSeconds() + ' => ' + ipsrc + " => Upload '" + filename + "' : " + msg + "\n")); 

}

function copyDict(dict) {
	var newDict = {};
	for (var key in dict) {
		newDict[key] = dict[key];
	}
	return newDict;
}

function ProcessPageInclude(page,PHJS,callback) {
	if (!fs.existsSync(page)) {
		callback([{type: "html", chaine: "<font color='red' size='4'>'"+page+"' does not exist</font>\n"}],PHJS.session,PHJS.global,PHJS.code);
	} else {
		if (fs.statSync(page).isDirectory()) {
			callback([{type: "html", chaine: "<font color='red' size='4'>'"+page+"' is not a file</font>\n"}],PHJS.session,PHJS.global,PHJS.code);
		} else {

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

				htl[i].debut = htl[i].debut + dif;

				htl[i].fin = htl[i].fin + dif;

				newht = file.substring(htl[i].debut,htl[i].fin);

				file = (file.substring(0,htl[i].debut) + "\necho(`" + remplace(remplace(newht,"`","\\'"),"\\'","\\`") + "`); " + file.substring(htl[i].fin,file.length));

				dif += (("\necho(`" + remplace(remplace(newht,"`","\\'"),"\\'","\\`") + "`); ").length - newht.length);

			}

			file = remplace(file,"<?phjs",""); // DROP PHJS TAGS FROM FILE

			file = remplace(file,"?>","");

			if (file.replace("--END--","") == file) {
				file += "\n--END--";
			}

			file = "function start(callback,PHJS,echo,echo_json) { var print = echo; \n" + remplace(file,"--END--","\ncallback(PHJS.content,PHJS.session,PHJS.global,PHJS.code);") + " } module.exports = { start: start };" // PUT FILE IN A FUNCTION FOR EXECUTE HIS JAVASCRIPT CODE

			try {

				file = rfs(file); //TRY IMPORT FILE

			} catch(e) {

				PHJS.log(500,'ERROR',"\nSyntax error when process '" + page + "' : \n" + PHJS.util.format(e));

				callback("ERROR");

			}

			var PHJS2 = {code: PHJS.code, util: PHJS.util, args: PHJS.args, content: new Array(), libs: PHJS.libs, cd: getPath(page), fileName: getFileName(page), ipsrc: PHJS.ipsrc, session: PHJS.session, global: PHJS.global, local: PHJS.local,
						log: PHJS.log,  errorLog: function(e) {
							PHJS.log(500,'ERROR',"\nError when process '"+PHJS.cd+"/"+PHJS.fileName+"' : \n"+PHJS.util.format(e))
						}, setCode: function(code) {
							PHJS.code = code;
						}, session_destroy: function() {
							for (var key in PHJS.session) {
								delete PHJS.session[key];
							}
						}, include: function(page, callback) {
							ProcessPageInclude(page,copyDict(PHJS), (content,session,global,code) => {
								if (content != "ERROR") {
									for (var i=0;i<content.length;i++) {
										PHJS.content.push(content[i]);
									}
									PHJS.session = session;
									PHJS.global = global;
									PHJS.code = code;
								} else {
									PHJS.content.push({type: "html", chaine: "<font color='red' size='4'>Error 500 in '"+page+"'</font><br/>\n"});
								}
								callback();
							});
						}};

			try { 

				file.start(function (content,session,global,code) { 

				   callback(content,session,global,code);

				},PHJS2, function (chaine) { PHJS.content.push({type: "html", chaine: chaine + " \n"}) },function (objet) { PHJS.content.push({type: "json", chaine: objet}) }); // TRY EXECUTE FILE, PUT RESULT IN 'CONTENT' VARIABLE, AND RETURN IT

			} catch(e) {

				PHJS.log(500,'ERROR',"\nExecution error when process '" + page + "' : \n" + PHJS.util.format(e));

				callback("ERROR");

			}
		}
	}
}



module.exports = {

	genconf: genconf,

	remplace: remplace,

	getargs: getargs,

	isAuthorized: isAuthorized,

	RedirectedTo: RedirectedTo,

	asMIME: asMIME,

	getPath: getPath,

	getFileName: getFileName,

	ProcessPageInclude: ProcessPageInclude,

	copyDict: copyDict,

	logupload: logupload,

	equal: equal,

	toMin: toMin,

	canUpload: canUpload

};