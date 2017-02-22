var superagent = require('superagent');
var async = require('async');
var cheerio = require('cheerio');


var fl = () => {
    var curLoadCnt = 0;
    return function (url, callback) {
        var delay = parseInt((Math.random() * 10000000) / 2000, 10);
        curLoadCnt++;

        console.log('现在并发数:', curLoadCnt, '正在抓取:', url, '随机延时:', delay);
        setTimeout(function () {
            // 用 superagent 去抓取 https://cnodejs.org/ 的内容
            superagent.get(url)
                .set('Host', 'www.zhihu.com')
                .set('User-Agent', 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/53.0.2785.113 Safari/537.36')
                // .set('Accept', 'application/json')
                .set('Cookie', 'd_c0="ABBAsOwBjwqPTi44qT20ewposidRQQSB4eU=|1474175763"; _za=24bff8a2-11a3-416d-87c7-c7ca4e882e24; _zap=8be1d6ee-f85e-45da-bad0-091f2e3dd7c3; q_c1=8deca2b8e6c345a9a2b1809db86ba181|1487046744000|1474175763000; cap_id="NzE1ZDhiMDhmYWY1NDdhNzhlZjY0NzkyMTM0ZjVmYmI=|1487046744|215deaede583222365565f05dafc2983b67634b2"; l_cap_id="NTFiMDU0NTM0YWIyNDhkMGJlOWZjNDY4MTdjYzk5NWI=|1487046744|0d228bcc3cc73b9086e2f1c4a0465e9e2a9fe4a8"; login="ZmFmZjc3ZWQwMWM0NDEwMTk0YjU3NDMwMDU5NzNmY2M=|1487046751|21c591f9825f6947dd50f9bdee08423b459fbd87"; _xsrf=3f49a155dab1e0042bbb5996311fe6b7; aliyungf_tc=AQAAADbB7WiDiQsAfAuMce1fkQ2KJV2g; s-q=AnZer_SH; s-i=1; sid=g1aa5on8; __utma=155987696.601419634.1487719846.1487719846.1487720000.2; __utmc=155987696; __utmz=155987696.1487720000.2.2.utmcsr=google|utmccn=(organic)|utmcmd=organic|utmctr=%E5%AE%89%E5%9C%A8--%E4%BF%A1%E6%81%AF%E5%AE%89%E5%85%A8%E6%96%B0%E5%AA%92%E4%BD%93%20%20%20%E4%BA%BA%E7%89%A9; z_c0=Mi4wQUJBS0tmRGdIZ2tBRUVDdzdBR1BDaGNBQUFCaEFsVk5YeFhLV0FCSFM2eE5KaWVSLUQ0Vm1uRk9SRW9NYTJwcnRn|1487674410|360e6005042d11262cf6a856d422209fb7dbf14c')
                .end(function (err, sres) {
                // 常规的错误处理
                if (err) {
                    return callback(err);
                }

                curLoadCnt--;
                callback(null, sres);
              });
        }, delay);

    }
};

// 首屏
var faceUrl = 'https://www.zhihu.com/people/du-mu-26/pins/posts';
var fetch = fl();
fetch(faceUrl, (err, result) => {
    if (err) {
        console.log(err);
    } else {
        // sres.text 里面存储着网页的 html 内容，将它传给 cheerio.load 之后
        // 就可以得到一个实现了 jquery 接口的变量，我们习惯性地将它命名为 `$`
        // 剩下就都是 jquery 的内容了
        var $ = cheerio.load(result.text);
        var pages = [];
        $('.Button.PaginationButton:not(.PaginationButton-prev, .PaginationButton-next)').each(function (idx, element) {
            var $element = $(element);
            pages.push($element.html());
        });
        
        // 构造分页url
        var preLink = 'https://www.zhihu.com/api/v4/members/du-mu-26/articles?include=data[*].comment_count,collapsed_counts,reviewing_comments_count,can_comment,comment_permission,content,voteup_count,created,updated,upvoted_followees,voting;data[*].author.badge[?(type=best_answerer)].topics&limit=20&sort_by=created&offset=';
        var lastPage = parseInt(pages[pages.length - 1], 10);
        var urls = new Array(lastPage).fill(0).map((element, idx) => {
            var offset = idx * 20;
            return preLink + offset; 
        });

        async.mapLimit(urls, 5, function (url, callback) {
            fetch(url, callback);
        }, function (err, results) {
            if (err) {
                console.log(err);
            } else {
                var data = results.map((result, idx) => {
                    // console.log(result.body.data.length, idx);
                    // 第三页只有18个数据，知乎bug!?
                    return result.body.data
                        .filter(data => {
                            if (data.title.indexOf('人物') > -1 || data.title.indexOf('访谈') > -1 || data.title.indexOf('新锐') > -1 ||
                                data.title.indexOf('白帽') > -1 || data.title.indexOf('极棒') > -1) {
                                return true;
                            }
                        })
                        .map(data => {
                            return {
                                'title': data.title,
                                'url': 'https://zhuanlan.zhihu.com/p/' + data.id
                            } 
                        });
                });
                console.log('final results:');
                console.log(data);

                var count = data.map(iter => {
                    return iter.length;
                }).reduce((prev, curr) => {
                    return prev + curr;
                });
                console.log('抓取数据总数:', count);
            }
        });

    }
});
