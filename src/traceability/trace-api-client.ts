import http = require('http')
import https = require('https')

// Return the corresponding module based on URL
let httpX = (url:URL) => {
    if (url.protocol === 'http')
        return http;
    if (url.protocol === 'https')
        return https;
}

class TraceabilityAPIClient {
    baseUrl: string
    constructor (url: string) {
        this.baseUrl = url
    }

    sendGet = (path:string) => {
        let url = new URL(path, this.baseUrl)
        httpX(url)
            .get(url.href, this.handleResponse(
                (data) => {
                    console.log(data)
                }
            ))
            .on('error', e => {
                console.error(`Got error: ${e.message}`)
            })
    }


    // Based on the example from the node docs: https://nodejs.org/docs/latest-v14.x/api/http.html#http_http_get_url_options_callback
    handleResponse = (callback: (data: Object) => void = undefined) => {
        return (res: http.IncomingMessage) => {
            const {statusCode} = res;
            const contentType = res.headers['content-type'];
            
            let error;
            if (statusCode != 200) {
                error = new Error(`Request failed with code: ${statusCode}`)
            } else if (!/^application\/(ld\+)?json/.test(contentType)) {
                error = new Error(`Invalid content type ${contentType}. Expected 'application/json' or 'application/ld+json'`)
            }
    
            if (error) {
                console.error(error.message)
                res.resume()
                return;
            }
    
            res.setEncoding('utf-8')
            let rawData = '';
            res.on('data', (chunk) => {rawData += chunk})
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(rawData)
                    callback(parsed)
                } catch (e) {
                    console.error(e)
                }
            });
        }
    }

}

export {TraceabilityAPIClient}