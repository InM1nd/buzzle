# Собирает обзорные картинки из ../screens и ../screens-360
from PIL import Image,ImageDraw,ImageFont
import os
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)),".."))
F=ImageFont.truetype("src/a/Nunito-Black.ttf",64);G=ImageFont.truetype("src/a/Nunito-Bold.ttf",34)
def ov(names,t,d,o,folder="screens"):
    ims=[Image.open(f"{folder}/{n}.png").convert("RGB") for n in names];ims=[im.resize((int(im.size[0]/im.size[1]*1688),1688),Image.LANCZOS) for im in ims]
    c=Image.new("RGB",(sum(im.size[0]+40 for im in ims)+40,1688+260),"#FDF0D6");dr=ImageDraw.Draw(c)
    dr.text((40,40),t,font=F,fill="#5A3410");dr.text((40,130),d,font=G,fill="#9A6A34");x=40
    for im in ims:
        m=Image.new("L",im.size,0);ImageDraw.Draw(m).rounded_rectangle((0,0,*im.size),60,fill=255);c.paste(im,(x,220),m);x+=im.size[0]+40
    os.makedirs("overviews",exist_ok=True);c.save(o)
ov(["01-hive-combs","02-hive-garden","03-play","04-puzzle-round"],"1 · Улей и Играть","Соты / Сад, место под украшения · пазл дня, выходных, бесконечный, Луг · экран раунда","overviews/1-hive-play.png")
ov(["05-bees","06-bee-detail","07-surprises-chests","08-chest-open"],"2 · Пчёлы и Сюрпризы","Все / Наряды, карточка пчелы · сундуки, шансы, гарантия · открытие соты","overviews/2-bees-surprises.png")
ov(["09-surprises-shop","10-surprises-album","11-tasks","12-tasks-more"],"3 · Лавка, Альбом, Задания","Честная лавка за пыльцу · альбом с бонусами · задания, недельный сундук, вход, заморозка, статистика","overviews/3-shop-album-tasks.png")
ov(["13-settings","14-language"],"4 · Настройки и первый запуск","Язык, звук, уведомления, сохранение, пригласить друга, обновление · выбор языка","overviews/4-settings-language.png")
ov(["01-hive-combs","03-play","07-surprises-chests","11-tasks"],"Проверка ширины 360","Те же экраны на 360 px","overviews/5-check-360.png","screens-360")
