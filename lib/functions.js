const fs = require("fs-extra");

function genconf(conffile) {
	var confstr = fs.readFileSync(conffile, "UTF-8");
	var conf = {allow: [], forbidden: [], redirect: [], options: []};
	var b;
	var nextword;
	var nextwordB;
	var last;
	var lastO;
	var target;
	var i = 0;
	while (i<confstr.length) {
		nextword = getnextword();
		if (nextword == "forbidden" | nextword == "allow") {
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
				conf[nextword].push(nextwordB);
                if (isnextword(";")) {
					b = 0;
				} else if (!isnextword(",")) {
					throw new Error("Incomplete file");
				}
			}
		} else if (nextword == "redirect"){
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
						if (nextword == "as" | nextword == "is" | nextword == "redirect") {
							//console.log("options/options");
							lastO = conf.options[last].options.length-1;
							conf.options[last].options[lastO].type = nextword;
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
					if (nextword == "no" | nextword == "yes") {
						conf.options[last].recursive = nextword;
					} else {
						throw new Error("Please put 'yes' or 'no' after 'recursive'");
					}
				} else {
					conf.options[last].recursive = "no";
				}
			} else if (getnextword == "") {
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
					   k = word.length;
				   } else if (confstr[j+k] != word[k]) {
					   isword = false;
					   k = word.length;
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
		   if (isok(confstr[j])) {
			   while(isok(confstr[j]) & j<confstr.length) {
				   nextword += confstr[j];
				   j += 1;
			   }
			   i = j;
			   if (i>=confstr.length & nextword != ";" & nextword != "yes" & nextword != "no") {
					throw new Error("Incomplete file");
			   }
			   j = confstr.length;
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
		console.log("redirect to " + repRedirectedto(getPath(target)));
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

module.exports = {
	genconf: genconf,
	remplace: remplace,
	getargs: getargs,
	isAuthorized: isAuthorized,
	RedirectedTo: RedirectedTo,
	asMIME: asMIME,
	getPath: getPath
};