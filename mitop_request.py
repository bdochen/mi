import requests
from lxml import etree
session = requests.Session()
new=0
url_test="http://app.mi.com/topList"
headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.132 Safari/537.36"}
s=session.get(url=url_test, headers=headers)
news=etree.HTML(s.text)
#app=news.xpath('/ul[@class="applist"]//li/h5/a')
app_title=news.xpath('//ul[@class="applist"]//li/h5/a/text()')
app_link=news.xpath('//ul[@class="applist"]//li/h5/a/@href')
app_num=len(app_title)
while new<app_num:
    print(app_title[new]) # 获得新闻标题
    print(app_link[new]) # 获得新闻标题
    new=new+1
