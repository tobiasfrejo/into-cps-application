const terms: {[key: string]: string} = {
    "name": "https://schema.org/name",
    "email": "https://schema.org/email",
    "hash": "https://schema.org/sha256",
    "time": "https://schema.org/DateTime",
    "type": "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
    "path": "http://into-cps.org/ns#Path",
    "version": "http://into-cps.org/ns#Version"
}
const prefixes: {[key: string]: string} = {
    "rdf": "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
    "prov": "http://www.w3.org/ns/prov#",
    "intocps": "http://into-cps.org/ns#",
}



const applyContext = (val: string) => {
    for(const [term, uri] of Object.entries(terms)) {
        if (val === uri) return term
    }

    for(const [prefix, full] of Object.entries(prefixes)) {
        if (val.startsWith(full))
            return val.replace(full, prefix+':')
    }

    return val
}

const expandWithContext = (val:string) => {
    if (val in terms) {
        return terms[val]
    }

    for(const [prefix, full] of Object.entries(prefixes)) {
        if (val.startsWith(prefix+':')) {
            return val.replace(prefix+':', full)
        }
    }

    return val
}

export {terms, prefixes, applyContext, expandWithContext}