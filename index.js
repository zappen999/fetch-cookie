var denodeify = require('es6-denodeify')(Promise)
var tough = require('tough-cookie')

module.exports = function fetchCookieDecorator (fetch, jar, expire = true) {
  fetch = fetch || window.fetch
  jar = jar || new tough.CookieJar()

  var getCookieString = denodeify(jar.getCookieString.bind(jar))
  var setCookie = denodeify(jar.setCookie.bind(jar))

  return function fetchCookie (url, opts) {
    opts = opts || {}

    return getCookieString(url, { expire })
      .then(function (cookie) {
        const realopts = Object.assign(opts, {
          headers: Object.assign(opts.headers || {}, (cookie ? { cookie: cookie } : {}))
        });
        console.log('realopts', realopts);
        return fetch(url, realopts);
      })
      .then(function (res) {
        var cookies

        if (res.headers.getAll) {
          // node-fetch v1
          cookies = res.headers.getAll('set-cookie')
        } else {
          // node-fetch v2
          var cookie = res.headers.get('set-cookie')
          cookies = cookie && cookie.split(',') || []
        }

        if (!cookies.length) {
          return res
        }

        return Promise.all(cookies.map(function (cookie) {
          return setCookie(cookie, res.url)
        })).then(function () {
          return res
        })
      })
  }
}
