const fs = require("fs-extra");

class Helpers {
    static delimiter = (process.platform === "win32" ? "\\" : "/");
    static cacheFiles = {};
    static logaccess;
    static logerror;
    static conf = {allow: [], forbidden: [], redirect: [], options: [], fastupload: {}};
    static proto;
    static path;

    static genconf(conffile) { // read config file and create a variable from this

        let confstr = fs.readFileSync(conffile, "UTF-8"); // String of config file

        let quote = false;
        for (let i = 0; i < confstr.length; i++) {
            if (confstr[i] === "'") {
                if (quote === "'") {
                    quote = false;
                } else if (!quote) {
                    quote = "'";
                }
            } else if (confstr[i] === '"') {
                if (quote === '"') {
                    quote = false;
                } else if (!quote) {
                    quote = '"';
                }
            }

            if (i < confstr.length - 1 && !quote) {
                if (confstr[i] + confstr[i + 1] === "//" || confstr[i] === "#") {
                    let start = i;
                    while (i < confstr.length - 1) {
                        if (confstr[i] === "\n" || confstr[i] === "\r") {
                            break;
                        }
                        i += 1;
                    }
                    let end = i;
                    confstr = confstr.substring(0, start) + confstr.substring(end, confstr.length);
                    i -= end - start;
                } else if (confstr[i] + confstr[i + 1] === "/*") {
                    let start = i;
                    while (i < confstr.length - 1) {
                        if (confstr[i] + confstr[i + 1] === "*/") {
                            i += 2;
                            break;
                        }
                        i += 1;
                    }
                    let end = (i <= confstr.length ? i : confstr.length);
                    confstr = confstr.substring(0, start) + confstr.substring(end, confstr.length);
                    i -= end - start;
                }

            }
        }


        let conf = {allow: [], forbidden: [], redirect: [], options: [], fastupload: {}}; // Object variable will contain config

        let id;

        let b;

        let nextword;

        let nextwordB;

        let last;

        let lastO;

        let target;

        let i = 0;

        while (i < confstr.length) {

            nextword = getnextword();

            if (h.equal(nextword, "forbidden") | h.equal(nextword, "allow")) {

                //console.log(nextword);

                if (confstr[i] != ':') {

                    if (getnextword([':']) != ':') {

                        throw new Error("Please put ':' after '" + nextword + "'");

                    }

                } else if (i == confstr.length - 1) {

                    throw new Error("Incomplete file");

                }

                b = 1;

                while (b == 1) {

                    nextwordB = getnextword();

                    if (nextwordB[nextwordB.length - 1] == "/") {

                        nextwordB = nextwordB.substring(0, nextwordB.length - 1);

                    }

                    if (process.platform == "win32") {
                        nextwordB = h.remplace(nextwordB, "/", "\\");
                    }

                    conf[nextword.toLowerCase()].push(nextwordB);

                    if (isnextword(";")) {

                        b = 0;

                    } else if (!isnextword(",")) {

                        throw new Error("Incomplete file");

                    }

                }

            } else if (h.equal(nextword, "redirect")) {

                //console.log("redirect");

                if (confstr[i] != ':') {

                    if (getnextword([':']) != ':') {

                        throw new Error("Please put ':' after '" + nextword + "'");

                    }

                } else if (i == confstr.length - 1) {

                    throw new Error("Incomplete file");

                }

                b = 1;

                while (b == 1) {

                    i += 1;

                    nextwordB = getnextword([":"])

                    if (nextwordB[nextwordB.length - 1] == "/") {

                        nextwordB = nextwordB.substring(0, nextwordB.length - 1);

                    }

                    if (process.platform == "win32") {
                        nextwordB = h.remplace(nextwordB, "/", "\\");
                    }

                    conf.redirect.push({elem: nextwordB});

                    if (isnextword("to")) {

                        last = conf.redirect.length - 1;

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

            } else if (h.equal(nextword, "fastupload")) {

                if (confstr[i] != ':') {

                    if (getnextword([':']) != ':') {

                        throw new Error("Please put ':' after '" + nextword + "'");

                    }

                } else if (i == confstr.length - 1) {

                    throw new Error("Incomplete file");

                }

                b = 1;

                while (b == 1) {

                    nextword = getnextword([";", ","]);

                    if (h.equal(nextword, "id")) {
                        id = getnextword();
                        if (typeof (conf.fastupload[id]) != "undefined") {
                            throw new Error("Id fastupload '" + id + "' is already defined");
                        }
                        conf.fastupload[id] = {};
                    } else if (h.equal(nextword, "maxsize")) {

                        if (typeof (conf.fastupload[id]) == "undefined") {
                            throw new Error("Please first define id");
                        }

                        if (typeof (conf.fastupload[id].maxsize) != "undefined") {

                            throw new Error("Maxsize is already defined for FastUpload");

                        }

                        nextwordB = getnextword();

                        if (nextwordB != "NaN" & nextwordB == parseInt(nextwordB).toString()) {

                            conf.fastupload[id].maxsize = parseInt(nextwordB);

                        } else {

                            throw new Error("'" + nextwordB + "' is not a valid number for maxsize");

                        }

                    } else if (h.equal(nextword, "finish")) {

                        if (typeof (conf.fastupload[id]) == "undefined") {
                            throw new Error("Please first define id");
                        }

                        if (typeof (conf.fastupload[id].finish) != "undefined") {

                            throw new Error("Finish function is already defined for FastUpload");

                        }

                        nextwordB = getnextword([":"]);

                        if (fs.existsSync(nextwordB)) {
                            if (!fs.statSync(nextwordB).isDirectory()) {
                                conf.fastupload[id].finish = nextwordB;
                            } else {
                                throw new Error("'" + nextwordB + "' is a directory");
                            }
                        } else {
                            throw new Error("'" + nextwordB + "' does not exist");
                        }

                    } else if (h.equal(nextword, "forbidden")) {

                        if (typeof (conf.fastupload[id]) == "undefined") {
                            throw new Error("Please first define id");
                        }

                        if (typeof (conf.fastupload[id].forbidden) != "undefined") {

                            throw new Error("Forbidden files names are already defined for FastUpload");

                        }
                        conf.fastupload[id].forbidden = [];

                        nextwordB = getnextword();
                        conf.fastupload[id].forbidden.push(nextwordB);

                        while (isnextword(",")) {
                            nextwordB = getnextword();
                            conf.fastupload[id].forbidden.push(nextwordB);
                        }

                    } else if (h.equal(nextword, "allow")) {

                        if (typeof (conf.fastupload[id]) == "undefined") {
                            throw new Error("Please first define id");
                        }

                        if (typeof (conf.fastupload[id].allow) != "undefined") {

                            throw new Error("Allowed files names are already defined for FastUpload");

                        }
                        conf.fastupload[id].allow = [];

                        nextwordB = getnextword();
                        conf.fastupload[id].allow.push(nextwordB);

                        while (isnextword(",")) {
                            nextwordB = getnextword();
                            conf.fastupload[id].allow.push(nextwordB);
                        }

                    } else if (nextword == "&" | nextword == ";") {

                        if (typeof (conf.fastupload[id].maxsize) != "undefined" & typeof (conf.fastupload[id].finish) != "undefined") {
                            if (typeof (conf.fastupload[id].allow) == "undefined") {
                                conf.fastupload[id].allow = [];
                            }
                            if (typeof (conf.fastupload[id].forbidden) == "undefined") {
                                conf.fastupload[id].forbidden = [];
                            }
                            if (nextword == ";") {
                                b = 0;
                            } else if (nextword == "&") {
                                id = undefined;
                            }

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

                    if (target[target.length - 1] == "/") {

                        target = target.substring(0, target.length - 1);

                    }

                    if (process.platform == "win32") {
                        target = h.remplace(target, "/", "\\");
                    }

                    if (confstr[i] != ")") {

                        if (getnextword([')']) != ')') {

                            throw new Error("Please put ')' after 'option(" + target + "'");

                        }

                    } else if (i == confstr.length - 1) {

                        throw new Error("Incomplete file");

                    }

                    i += 1;

                    if (confstr[i] != ":") {

                        if (getnextword([':']) != ':') {

                            throw new Error("Please put ':' after 'option(" + target + ")'");
                        }

                    } else if (i == confstr.length - 1) {

                        throw new Error("Incomplete file");

                    }

                    i += 1;

                    conf.options.push({});

                    last = conf.options.length - 1;

                    conf.options[last].target = h.removeLastSlash(target);

                    conf.options[last].options = [];

                    b = 1;

                    while (b == 1) {

                        if (i >= confstr.length) {

                            throw new Error("Incomplete file");

                        }

                        if (isnextword('file')) {

                            conf.options[last].options.push({file: getnextword()});

                            nextword = getnextword();

                            if (h.equal(nextword, "as") | h.equal(nextword, "is") | h.equal(nextword, "redirect") | h.equal(nextword, "openinstead")) {

                                //console.log("options/options");

                                lastO = conf.options[last].options.length - 1;

                                conf.options[last].options[lastO].type = nextword.toLowerCase();

                                nextword = getnextword([":"]);

                                if (conf.options[last].options[lastO].type === "openinstead" && !fs.existsSync(h.path + nextword)) {
                                    throw new Error("File or folder '" + h.path + nextword + "' does not exist");
                                }

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

                        if (h.equal(nextword, "yes") | h.equal(nextword, "no")) {

                            conf.options[last].recursive = nextword.toLowerCase();

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

            let isword;

            for (let j = i; j < confstr.length; j++) {

                if (confstr[j] != " " & confstr[j] != "\n" & confstr[j] != "\r" & confstr[j] != "\t" & confstr[j] != "") {

                    isword = true;

                    for (let k = 0; k < word.length; k++) {

                        if (j + k >= confstr.length) {

                            isword = false;

                            break;

                        } else if (confstr[j + k].toLowerCase() != word[k].toLowerCase()) {

                            isword = false;

                            break;

                        }

                    }

                    if (isword == true) {

                        i = j + word.length;

                        if (i >= confstr.length & word != ";" & !h.equal(word, "yes") & !h.equal(word, "no")) {

                            throw new Error("Incomplete file");

                        }

                    }

                    break;

                }

                if (j >= confstr.length - 1) {

                    isword = false;

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

            const toskip = [" ", "\n", "\r", "\t", ",", ";", ":", "(", ")"];

            let nextword = "";

            for (let j = i; j < confstr.length; j++) {

                if (confstr[j] == "'" | confstr[j] == '"') {
                    let delimiter = confstr[j];
                    j += 1;
                    while (confstr[j] != delimiter) {
                        nextword += confstr[j];
                        j += 1;
                    }

                    i = j + 1;

                    if (i >= confstr.length & nextword != ";" & !h.equal(nextword, "yes") & !h.equal(nextword, "no")) {

                        throw new Error("Incomplete file");

                    }

                    break;

                } else if (isok(j)) {
                    while (isok(j) & j < confstr.length) {
                        nextword += confstr[j];
                        j += 1;
                    }

                    i = j;

                    if (i >= confstr.length & nextword != ";" & !h.equal(nextword, "yes") & !h.equal(nextword, "no")) {
                        throw new Error("Incomplete file");
                    }

                    break;

                }

            }

            return nextword;

            function isok(index) {

                let out = true;

                for (let k = 0; k < toskip.length; k++) {

                    let allEqual = true;
                    for (let l = 0; l < toskip[k].length; l++) {
                        if (index + l > confstr.length - 1) {
                            allEqual = false;
                            break;
                        }
                        if (confstr[index + l] != toskip[k][l]) {
                            allEqual = false;
                            break;
                        }
                    }

                    if (allEqual) {

                        out = false;

                        break;

                    }

                }

                if (out == false) {

                    for (let k = 0; k < noskip.length; k++) {

                        let allEqual = true;
                        for (let l = 0; l < noskip[k].length; l++) {
                            if (index + l > confstr.length - 1) {
                                allEqual = false;
                                break;
                            }
                            if (confstr[index + l] != noskip[k][l]) {
                                allEqual = false;
                                break;
                            }
                        }

                        if (allEqual) {

                            out = true;

                            break;

                        }

                    }

                }

                return out

            }

        }

    }

    static equal(A, B) {
        return (A.toLowerCase() === B.toLowerCase());
    }

    static removeLastSlash(path) {

        if (path[path.length - 1] == "/") {

            return path.substring(0, path.length - 1);

        } else {

            return path;

        }

    }

    static remplace(words, a, b) {

        while (words != words.replace(a, b)) {

            words = words.replace(a, b);

        }

        return words;

    }

    static countOccu = (str, word) => (str.length - h.remplace(str, word, "").length) / word.length;

    static getargs(args0) {

        if (typeof (args0) == "string") {

            let args = {};

            args0 = args0.split("&");

            for (let i = 0; i < args0.length; i++) {

                args[args0[i].split("=")[0]] = args0[i].split("=")[1];

            }

            return args;

        } else {

            return {};

        }

    }

    static asMIME(file) {
        let conf = h.conf;

        for (let i = 0; i < conf.options.length; i++) {

            if ((conf.options[i].recursive == "yes" & h.isInRep(conf.options[i].target, h.getPath(file)))

                | (conf.options[i].recursive == "no" & conf.options[i].target == h.getPath(file))) {

                for (let j = 0; j < conf.options[i].options.length; j++) {

                    if (h.isInModel(h.getFileName(file), conf.options[i].options[j].file) == true & conf.options[i].options[j].type == "as") {

                        return conf.options[i].options[j].val;

                    }

                }

            }

        }

        return false;

    }

    static openInstead(target, path) {
        let conf = h.conf;

        if (fs.existsSync(path + target)) {
            return target;
        }
        let folder = h.getPath(target);
        for (let i = 0; i < conf.options.length; i++) {
            if ((conf.options[i].recursive == "yes" & h.isInRep(conf.options[i].target, folder))
                | (conf.options[i].recursive == "no" & conf.options[i].target == folder)) {
                let option = conf.options[i];
                let fileName = h.getFileName(target);
                for (let j = 0; j < option.options.length; j++) {
                    if (option.options[j].type == "openinstead") {
                        if (h.isInModel(fileName, option.options[j].file)) {
                            return option.options[j].val;
                        }
                    }
                }
            }
        }
        return target
    }

    static RedirectedTo(target, type) {

        if (type == "file") {

            let redirect = h.repRedirectedto(h.getPath(target));

            if (redirect == false) {

                redirect = h.fileRedirectedto(target);

            }

            return redirect;

        } else if (type == "folder") {

            return h.repRedirectedto(h.getPath(target));

        }

    }

    static fileRedirectedto(file) {
        let conf = h.conf;

        for (let i = 0; i < conf.options.length; i++) {

            if ((conf.options[i].recursive == "yes" & h.isInRep(conf.options[i].target, h.getPath(file)))

                | (conf.options[i].recursive == "no" & conf.options[i].target == h.getPath(file))) {

                for (let j = 0; j < conf.options[i].options.length; j++) {

                    if (h.isInModel(h.getFileName(file), conf.options[i].options[j].file) == true & conf.options[i].options[j].type == "redirect") {

                        return conf.options[i].options[j].val;

                    }

                }

            }

        }

        return false;

    }

    static repRedirectedto(path) {
        let conf = h.conf;

        let out = false;

        let subrep = 0;

        for (let i = 0; i < conf.redirect.length; i++) {

            if (h.isInRep(conf.redirect[i].elem, path) == true & h.getNumberSubRep(conf.redirect[i].elem) > subrep) {

                out = conf.redirect[i].redirect;

                subrep = h.getNumberSubRep(conf.redirect[i].elem);

            }

        }

        return out;

    }

    static isAuthorized(target, type) {

        if (type == "file") {

            //console.log("repautorized (type file)");

            if (!h.repIsAuthorized(h.getPath(target))) {

                return false;

            }

            if (!h.fileIsAuthorized(target)) {

                return false;

            }

            return true;

        } else if (type == "folder") {

            //console.log("repautorized (type folder)");

            if (!h.repIsAuthorized(target)) {

                return false;

            }

            return true;

        }

    }

    static fileIsAuthorized(file) {

        let conf = h.conf;

        let out = true;

        for (let i = 0; i < conf.options.length; i++) {

            if ((conf.options[i].recursive == "yes" & h.isInRep(conf.options[i].target, h.getPath(file)))

                | (conf.options[i].recursive == "no" & conf.options[i].target == h.getPath(file))) {

                //console.log(conf.options[i].recursive + " | " + conf.options[i].target + " => " + getPath(file));

                out = false;

                for (let j = 0; j < conf.options[i].options.length; j++) {

                    if (h.isInModel(h.getFileName(file), conf.options[i].options[j].file) == true & conf.options[i].options[j].type == "is" & conf.options[i].options[j].val == "allow") {

                        out = true;

                        j = conf.options[i].options.length;

                    }

                }

                if (out == false) {

                    out = true;

                    for (let j = 0; j < conf.options[i].options.length; j++) {

                        if (h.isInModel(h.getFileName(file), conf.options[i].options[j].file) == true & conf.options[i].options[j].type == "is" & conf.options[i].options[j].val == "forbidden") {

                            out = false;

                            j = conf.options[i].options.length;

                        }

                    }

                }

            }

        }

        return out;

    }

    static repIsAuthorized(path) {

        path = h.removeLastSlash(path);

        let param = "forbidden";

        let res = h.repIsInParam(0, param, path);

        while (res.continue) {

            //console.log("repisparam while : " + subrep)

            param = param == "forbidden" ? "allow" : "forbidden";

            res = h.repIsInParam(res.subrep, param, path)

        }

        //console.log("finish : " + param);

        return (param == "forbidden");

    }

    static repIsInParam(subrep, param, path) {

        let conf = h.conf;

        if (typeof (conf[param]) == "undefined") {

            return {continue: false, subrep: 0};

        }

        for (let j = 0; j < conf[param].length; j++) {

            if (h.isInRep(conf[param][j], path) == true & h.getNumberSubRep(conf[param][j]) > subrep) {

                //console.log("isinrep(" + conf[param][j] + "," + path + ")")

                return {continue: true, subrep: h.getNumberSubRep(conf[param][j])};

            }

        }

        return {continue: false, subrep: subrep};

    }

    static getNumberSubRep(path) {

        return path.split(h.delimiter).length;

    }

    static canUpload(filename, fastupload) {
        let allow = true;
        for (let i = 0; i < fastupload.forbidden.length; i++) {
            if (h.isInModel(filename, fastupload.forbidden[i])) {
                allow = false;
                break;
            }
        }
        if (allow == false) {
            for (let i = 0; i < fastupload.allow.length; i++) {
                if (h.isInModel(filename, fastupload.allow[i])) {
                    allow = true;
                    break;
                }
            }
        }
        return allow;
    }

    static isInModel(name, model) {

        if (model == "*") {

            return true;

        } else if (model.replace("*", "") == model) {

            if (name == model) {

                return true;

            } else {

                return false;

            }

        } else if (model[0] == "*" & model[model.length - 1] == "*") {

            if (h.remplace(name, h.remplace(model, "*", ""), "") != name) {

                return true;

            } else {

                return false;

            }

        } else if (model[0] != "*" & model[model.length - 1] == "*") {

            if (name.substring(0, h.remplace(model, "*", "").length) == h.remplace(model, "*", "")) {

                return true;

            } else {

                return false;

            }

        } else if (model[0] == "*" & model[model.length - 1] != "*") {

            if (name.substring(name.length - h.remplace(model, "*", "").length, name.length) == h.remplace(model, "*", "")) {

                return true;

            } else {

                return false;

            }

        }

    }

    static getFileName(file) {

        return file.split(h.delimiter)[file.split(h.delimiter).length - 1];

    }

    static isInRep(rep, inside) {

        let insideSplit = inside !== "" ? inside.trim().split(h.delimiter) : [];
        let repSplit = rep !== "" ? rep.trim().split(h.delimiter) : [];

        if (insideSplit.length < repSplit.length) return false;

        for (let i = 0; i < insideSplit.length; i++) {

            if (typeof (repSplit[i]) == "undefined") {
                return true;
            }
            if (insideSplit[i] != repSplit[i]) {
                return false;
            }

        }
        return true;

    }

    static getPath(target) {

        let path = "";

        let targetsplit = target.split(h.delimiter);

        for (let i = 0; i < targetsplit.length - 1; i++) {

            path += targetsplit[i] + h.delimiter;

        }

        path = path.substring(0, path.length - 1);

        return path;

    }

    static lenDict = dict => Object.keys(dict).length;

    static logupload(ipsrc, filename, msg, logfile) {

        let date = new Date();

        fs.appendFileSync(logfile,

            (date.getFullYear() + '/' + (date.getMonth() + 1) + '/' + date.getDate() + "  " + date.getHours() + ':' + date.getMinutes() + ':' + date.getSeconds() + ' => ' + ipsrc + " => Upload '" + filename + "' : " + msg + "\n"));

    }

    static copyDict(dict) {
        return {...dict}
    }

    static addMissingZero(val, length = 2) {
        val = val.toString();
        while (val.length < length) {
            val = "0"+val;
        }
        return val;
    }

}

const h = Helpers;

module.exports = Helpers;