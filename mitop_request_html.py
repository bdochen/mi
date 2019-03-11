from requests_html import HTMLSession

session = HTMLSession()

r = session.get("http://app.mi.com/topList")

# 通过CSS找到新闻标签
news = r.html.find('ul.applist > li > h5 >a')

for new in news:
    print(new.text)  # 获得新闻标题
    print(new.absolute_links)  # 获得新闻链接
