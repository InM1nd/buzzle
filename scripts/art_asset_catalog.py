#!/usr/bin/env python3
"""Index art without changing source files; reusable static gallery builder."""
import argparse
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
from PIL import Image, ImageOps

REPO = Path(__file__).resolve().parents[1]
SUFFIXES = {'.png', '.webp', '.jpg', '.jpeg', '.gif', '.svg'}
SPECIES = {'zhuzha':'Жужа','pushinka':'Пушинка','boris':'Борис','solnyshko':'Солнышко','klevera':'Клеверина','lavanda':'Лаванда','vasilek':'Василёк','myatka':'Мятка','iskorka':'Искорка','sonya':'Соня','zorkaya':'Зоркая','margo':'Марго','nochka':'Ночка'}
CATEGORIES = ['Пчёлы','Наряды','Глифы и соты','Фоны и грядки','Растения','Декор','Коробки и сундуки','Ресурсы и инструменты','Награды и усилители','Иконки и промо','Ночной полёт','Макеты и проверки','3D-пробы','Прочее']
ACCESSORIES = {'crown':'Корона','scarf':'Шарф','bow':'Бант','backpack':'Сумка','satchel':'Сумка','bag':'Сумка','wreath':'Венок','beret':'Берет','glasses':'Очки','halo':'Нимб','headphones':'Наушники'}
TITLES = {'honey':'Мёд','nectar':'Нектар','jelly':'Маточное молочко','pollen':'Пыльца','fragment':'Фрагмент пчелы','seeds':'Семена','watering-can':'Лейка','shovel':'Лопатка','lanterns':'Фонарики','flags':'Флажки','barrel':'Бочка','bench':'Скамейка','mushroom':'Гриб','pinwheel':'Вертушка','fountain':'Фонтан','gnome':'Гном','garden-background':'Фон сада','hive-background':'Фон улья','bed-dry':'Сухая грядка','bed-wet':'Политая грядка','box-wood':'Деревянная коробка','box-wax':'Восковая коробка','box-gold':'Золотая коробка','box-royal':'Королевская коробка','chest':'Сундук','chest-open':'Открытый сундук','sunflower':'Подсолнух','clover':'Клевер','lavender':'Лаванда','cornflower':'Василёк','mint':'Мята','moonpoppy':'Лунный мак','goldsun':'Златоцвет','sprout':'Росток','cell0':'Солнце','cell1':'Сердце','cell2':'Цветок','cell3':'Капля','cell4':'Лист','cell_wild':'Джокер','bomb':'Бомба'}

TITLES.update({'cell_pumpkin':'Тыквенная сота','ghost_overlay':'Призрак поверх соты','event_point':'Очко события / тыковка','pumpkin_bud':'Молодая тыква','pumpkin_bloom':'Зрелая тыква','hive_bg_night':'Ночной улей','garden_bg_night':'Ночной сад','first-batch':'Тыквенная ночь / первая партия','tiles-ghost-check':'Призрак на пяти цветах / проверка','lantern-side-view':'Фонарик / слой для Пушинки','bat_1':'Летучая мышь / крылья вверх','bat_2':'Летучая мышь / середина взмаха','bat_3':'Летучая мышь / крылья вниз','stem_top':'Стебель / верхнее препятствие','stem_bottom':'Стебель / нижнее препятствие','candy_1':'Оранжевая сладость','candy_2':'Лиловая сладость','candy_3':'Мятный леденец','firefly':'Светлячок','flight-batch-v1':'Ночной полёт / вторая партия','lantern-fit':'Фонарик / примерка на Пушинке','bat-flap':'Летучая мышь / проба анимации'})

def files():
    return sorted(p for folder in ('assets','design','outputs') for p in (REPO/folder).rglob('*') if p.is_file() and p.suffix.lower() in SUFFIXES and 'asset-library' not in p.parts)

def classify(rel):
    p=rel.lower(); stem=Path(rel).stem
    species=next((v for k,v in SPECIES.items() if k in p.split('/') or k in stem.lower()),'')
    accessory=next((v for k,v in ACCESSORIES.items() if k in stem.lower()),'')
    category='Прочее'
    if 'assets/art/turn/' in p: category='Наряды' if accessory else 'Пчёлы'
    elif any(v in p for v in ('accessor','headwear','cloth','crown','audio-halo')): category='Наряды'
    elif any(v in p for v in ('bee-turn','zhuzha-turn','bees-prototype')): category='Пчёлы'
    elif any(v in p for v in ('glyph','puzzle-tiles','combs-','cell','assets/art/bomb')): category='Глифы и соты'
    elif any(v in p for v in ('environment','assets/art/env/','background','bed-dry','bed-wet')): category='Фоны и грядки'
    elif any(v in p for v in ('plants','assets/art/garden/')): category='Растения'
    elif any(v in p for v in ('decor','lanterns','flags','barrel','bench','mushroom','pinwheel','fountain','gnome')): category='Декор'
    elif any(v in p for v in ('boxes','box-','chest')): category='Коробки и сундуки'
    elif any(v in p for v in ('rewards','boosters','boost-','freeze')): category='Награды и усилители'
    elif any(v in p for v in ('items','resources','pollen','fragment')): category='Ресурсы и инструменты'
    if 'design/brand/' in p or any(v in p for v in ('icon','favicon','splash','telegram','poster','banner')): category='Иконки и промо'
    if p.startswith(('design/3d/','design/bees3d/','outputs/zhuzha-turnaround')): category='3D-пробы'
    if p.startswith(('design/v1.5-ui/','design/2d/asset-preview/')): category='Макеты и проверки'
    if p.startswith('outputs/') and category=='Прочее': category='Макеты и проверки'
    if '/all-species-accessories-v1/' in p and not accessory:category='Пчёлы'
    role='Изображение'
    if any(v in stem.lower() for v in ('sheet','compare','overview','contact','collection','all-options')) or '/all-assets-review/' in p: role='Лист / сравнение'
    if any(v in stem.lower() for v in ('-raw','-generated','source-sheet','-source')):role='Исходник / сырой'
    if any(v in stem.lower() for v in ('-rear','-front-front','-antennae','-mask','wing-left','wing-right','-wing-','-accessory')) or stem.startswith(('w0_','w1_')):role='Отдельный слой'
    if p.startswith('assets/art/turn/'):role='Отдельный слой'
    if '/all-species-accessories-v1/' in p:
        if stem.endswith('-view'):role='Собранный вид'
        elif role=='Изображение':role='Отдельный слой'
    if '/bee-turnarounds/assets/' in p and role=='Изображение':role='Отдельный слой'
    if any(v in stem.lower() for v in ('in-app','screenshot')):role='Проверка в игре'
    style='Медовый кристалл'
    if 'glyph-contrast-options' in p:
        if stem.startswith(('01-','04a-')):style='Мягкий кристалл'
        elif stem.startswith(('02-','04b-')):style='Матовая пастель'
        elif stem.startswith(('03-','04-')):style='Тёплый воск'
        elif stem=='bomb-compact':style='Мягкий кристалл'
        else:style='Сравнение стилей'
    elif 'soft-crystal' in p:style='Мягкий кристалл'
    elif p.startswith('design/concepts/') or 'buzzle-1-' in p or 'buzzle-2-' in p or 'buzzle-3-' in p or 'buzzle-4-' in p:style='Ранние концепты'
    if category=='3D-пробы':style='3D-проба'
    season='Хеллоуин' if 'halloween' in p or stem.startswith(('04a-','04b-')) or ('glyph-contrast-options' in p and stem=='04-halloween') else 'Обычные'
    if 'halloween-assets' in p and stem=='garden-background':season='Осень'
    status='Основная коллекция'
    if p.startswith('assets/'):status='Рабочие файлы'
    if 'halloween' in p or 'glyph-contrast-options' in p:status='Кандидат / вариант'
    if p.startswith('outputs/') or category=='3D-пробы' or style=='Ранние концепты':status='Архив / пробы'
    if p.startswith('design/2d/') and not any(v in p for v in ('all-species-accessories-v1/','bee-turnarounds/','zhuzha-turnaround/','asset-preview/')):status='Архив / пробы'
    if any(v in stem.lower() for v in ('-old','-broken','-raw','-generated')):status='Архив / пробы'
    if 'headphones' in p:status='Исключено'
    if 'audio-halo' in p and 'halo' not in stem.lower():status='Исключено'
    if p.startswith('design/2d/halloween/'):
        section=p.split('/')[3]
        category={'tiles':'Глифы и соты','ui':'Награды и усилители','env':'Фоны и грядки','garden':'Растения','costumes':'Наряды','deco':'Декор','trick':'Декор','flight':'Ночной полёт'}.get(section,'Макеты и проверки')
        status='Кандидат / вариант';season='Хеллоуин';style='Медовый кристалл'
        if section=='review':role='Лист / сравнение'
        if stem in {'witchhat-front-view','witchhat-q3-front-view','witchhat-side-view','witchhat-fit-v1','witchhat-profile-v7','witchhat-profile-check-v7'}:status='Утверждено'
        if section=='review' and stem in {'witchhat-profile-v3','witchhat-profile-check-v3','witchhat-side-fix-v2','witchhat-profile-v4','witchhat-profile-check-v4','witchhat-profile-v5','witchhat-profile-check-v5','witchhat-profile-v6','witchhat-profile-check-v6'}:status='Архив / пробы'
    title=TITLES.get(stem,stem.replace('_',' ').replace('-',' '))
    if p.startswith('design/2d/halloween/'):
        title={'bg_sky':'Ночной полёт / небо','bg_far':'Ночной полёт / дальние холмы','bg_near':'Ночной полёт / передний план','parallax-repeat-check':'Фоны полёта / проверка повторов','parallax-scene':'Ночной полёт / общий вид','parallax-motion':'Ночной полёт / проба параллакса'}.get(stem,title)
        if p.startswith('design/2d/halloween/flight/') and stem=='icon':title='Иконка Ночного полёта'
        if stem.startswith('batwings-'):
            title='Крылья летучей мыши / '+{'batwings-back-front-view':'спереди','batwings-back-q3-front-view':'три четверти','batwings-back-side-view':'профиль','batwings-fit-v1':'прежняя примерка v1','batwings-fit-v2':'актуальная примерка v2','batwings-profile-check-v2':'светлые крылья / до и после','batwings-natural-side-v2':'целые светлые крылья / профиль v2'}.get(stem,stem)
            if section=='costumes':role='Отдельный слой'
            if stem=='batwings-fit-v1':status='Архив / пробы'
        if stem.startswith('pumpkinwreath-'):
            title='Осенний венок / '+{'pumpkinwreath-front-view':'спереди','pumpkinwreath-q3-front-view':'три четверти','pumpkinwreath-side-view':'профиль','pumpkinwreath-fit-v1':'примерка трёх ракурсов'}.get(stem,stem)
            if section=='costumes':role='Отдельный слой'
        if stem.startswith('ghosthood-'):
            title='Капюшон-привидение / '+{'ghosthood-front-view':'спереди','ghosthood-q3-front-view':'три четверти','ghosthood-side-view':'профиль','ghosthood-fit-v1':'примерка трёх ракурсов','ghosthood-side-antennae-front':'исходные усики / профиль','ghosthood-q3-front-antennae-front':'исходные усики / три четверти'}.get(stem,stem)
            if section=='costumes':role='Отдельный слой'
        if stem.startswith('vampcape-'):
            status='Требует доработки'
            title='Плащ вампира / '+{'vampcape-fit-v1':'примерка трёх ракурсов','vampcape-layers-v1':'все отдельные слои','vampcape-front-front-view':'воротник / спереди','vampcape-front-q3-front-view':'воротник / три четверти','vampcape-front-side-view':'воротник / профиль','vampcape-back-front-view':'задняя ткань / спереди','vampcape-back-q3-front-view':'задняя ткань / три четверти','vampcape-back-side-view':'задняя ткань / профиль'}.get(stem,stem)
            if section=='costumes':role='Отдельный слой'
        if stem.startswith('pumpkinhat-'):
            title='Тыква-шапка / '+{'pumpkinhat-front-view':'спереди','pumpkinhat-q3-front-view':'три четверти','pumpkinhat-side-view':'профиль','pumpkinhat-fit-v1':'примерка трёх ракурсов','pumpkinhat-side-base':'исходный профиль для посадки','pumpkinhat-side-antennae-front':'передний слой усиков'}.get(stem,stem)
            if 'antennae' in stem:role='Отдельный слой'
        if stem.startswith('witchhat-'):title='Ведьминская шляпа / '+{'witchhat-front-view':'спереди','witchhat-q3-front-view':'три четверти','witchhat-side-view':'профиль','witchhat-fit-v1':'примерка трёх ракурсов','witchhat-profile-v4':'отклонённый профиль v4','witchhat-profile-check-v4':'отклонённая примерка v4','witchhat-profile-v5':'новый профиль / кандидат','witchhat-profile-check-v5':'отклонённая примерка v5','witchhat-profile-v6':'выбранная посадка / передний усик','witchhat-profile-check-v6':'усики приняты / прежние крылья','witchhat-profile-v7':'утверждённый профиль','witchhat-profile-check-v7':'крепление крыльев / сравнение с Жужей'}.get(stem,stem)
    if 'glyph-contrast-options' in p:
        title={'01-soft-crystal':'Глифы · Мягкий кристалл','02-matte-pastel':'Глифы · Матовая пастель','03-warm-wax':'Глифы · Тёплый воск','04-halloween':'Глифы · Ранний Хеллоуин','04a-halloween-soft-crystal':'Глифы · Хеллоуин 4А / кристалл','04b-halloween-matte-pastel':'Глифы · Хеллоуин 4Б / пастель','bomb-compact':'Компактная бомба'}.get(stem,title)
    preserve_costume_title=p.startswith('design/2d/halloween/') and stem.startswith(('ghosthood-','batwings-','pumpkinwreath-'))
    if species and accessory and not preserve_costume_title:title=f'{species} · {accessory} · {stem}'
    elif species and not preserve_costume_title:title=f'{species} · {stem}'
    if species and not preserve_costume_title:
        pose=next((label for key,label in [('q3-front-left','Три четверти спереди / влево'),('q3-back-left','Три четверти сзади / влево'),('q3-front','Три четверти спереди'),('q3-back','Три четверти сзади'),('side-left','Профиль / влево'),('front','Спереди'),('back','Со спины'),('side','Профиль'),('top','Сверху')] if key in stem.replace('backpack','bag')),'')
        if pose:title=' · '.join(v for v in (species,accessory,pose) if v)
    if p.startswith('design/2d/halloween/'):
        style_names={'bright':'Медовый кристалл','soft':'Мягкий кристалл','pastel':'Матовая пастель','wax':'Тёплый воск','hsoft':'Мягкий кристалл','hpastel':'Матовая пастель','hwax':'Тёплый воск'}
        labels={'bright':'яркий','soft':'мягкий кристалл','pastel':'матовая пастель','wax':'тёплый воск','hsoft':'Halloween / мягкий кристалл','hpastel':'Halloween / матовая пастель','hwax':'Halloween / тёплый воск'}
        if '/tiles/styles/' in p:
            code=p.split('/tiles/styles/')[1].split('/')[0];style=style_names.get(code,style);title='Тыквенная сота / '+labels.get(code,code)+' / v3'
        if '/tiles/hbright/' in p:
            title='Яркий Halloween / '+{'cell0':'солнце','cell1':'сердце','cell2':'цветок','cell3':'капля','cell4':'лист','cell_wild':'джокер','bomb':'компактная бомба'}.get(stem,stem)+' / v3'
        if '/costumes/rework-v3/' in p:
            status='Кандидат / вариант';role='Отдельный слой';title='Костюм v3 / '+stem.replace('-',' ')
        review_titles={'pumpkin-styles-v3':'Тыквенные соты / все семь стилей','hbright-glyphs-v3':'Яркие глифы / обычные и Halloween','puzzle-backgrounds-v3':'Головоломка / осенний и Halloween фоны','pumpkinwreath-rework-v3':'Осенний венок / актуальная посадка v3','vampcape-rework-v3':'Плащ вампира / пересборка v3','batwings-rework-v3':'Крылья летучей мыши / передний слой v3','costumes-rework-v3':'Все костюмы / пересборка v3','profile-locked-wings-v3':'Профиль / обычные крылья в исходном положении','all-changes-v3':'Halloween / все изменения v3'}
        if stem in review_titles:
            title=review_titles[stem];status='Кандидат / вариант';role='Лист / сравнение'
        if stem in {'pumpkin-styles-v3','all-changes-v3'}:style='Сравнение стилей'
        if stem in {'puzzle-autumn-v3','puzzle-halloween-v3'}:
            title='Фон головоломки / '+('осень' if 'autumn' in stem else 'Halloween');season='Осень' if 'autumn' in stem else 'Хеллоуин'
        if stem in {'batwings-natural-side-v2','batwings-fit-v2','batwings-profile-check-v2','pumpkinwreath-fit-v1'}:status='Архив / пробы'
        if '/costumes/' in p and '/rework-v3/' not in p and stem.startswith('pumpkinwreath-'):status='Архив / пробы'
    if p.startswith('design/2d/halloween/'):
        if stem == 'all-glyph-styles-v4':
            title='Все глифы / восемь стилей / бомбы и тыквы';role='Лист / сравнение';style='Сравнение стилей';status='Кандидат / вариант'
        if stem == 'zhuzha-wreath-vampire-v4':
            title='Жужа / венок и костюм вампира / три ракурса';role='Лист / сравнение';species='Жужа';status='Требует доработки'
        if '/costumes/rework-v3/zhuzha/' in p:
            species='Жужа';title='Жужа / примерка / '+stem.replace('-',' ')
            if stem.startswith('vampcape'):status='Требует доработки'
    if p.startswith('design/2d/halloween/'):
        if '/tiles/rework-v5/' in p:
            code=p.split('/tiles/rework-v5/')[1].split('/')[0]
            style={'bright':'Медовый кристалл','hbright':'Медовый кристалл','hsoft':'Мягкий кристалл','hpastel':'Матовая пастель','hwax':'Тёплый воск'}.get(code,style)
            title='Глифы v5 / '+code+' / '+{'cell0':'солнце','cell1':'сердце','cell2':'цветок','cell3':'капля','cell4':'лист','cell_wild':'джокер','bomb':'бомба — размер исправлен','cell_pumpkin':'тыква'}.get(stem,stem)
            status='Кандидат / вариант';role='Изображение'
        if '/costumes/rework-v5/zhuzha/' in p:
            species='Жужа';title='Жужа / плащ вампира v5 / '+stem;status='Кандидат / вариант';role='Изображение' if stem.startswith('preview-') else 'Отдельный слой'
        if '/costumes/rework-v3/zhuzha/' in p and stem.startswith(('wreath-','antennae-')):status='Одобрено'
        reviews_v5={'all-glyph-styles-v5':'Все глифы / единые Halloween-детали v5','bomb-size-v5':'Яркие бомбы / размер до и после','zhuzha-vampire-v5':'Жужа / плащ вампира до и после v5'}
        if stem in reviews_v5:title=reviews_v5[stem];role='Лист / сравнение';status='Кандидат / вариант';style='Сравнение стилей'
        if '/sources/rework-v5/' in p:role='Лист / источник';status='Архив / пробы'
    if p == 'design/2d/halloween/review/bright-bomb-size-v6.png':
        title='Яркая бомба / уменьшение до размера остальных v6';role='Лист / сравнение';status='Кандидат / вариант';style='Сравнение стилей'
    if p.startswith('design/2d/halloween/'):
        titles_v7={'bright-bomb-complete-v7':'Яркая бомба / восстановленный целый контур v7','zhuzha-vampire-current-v7':'Жужа / актуальный костюм вампира / три ракурса'}
        if stem in titles_v7:title=titles_v7[stem];role='Лист / сравнение';status='Кандидат / вариант'
        if '/sources/rework-v7/' in p:role='Лист / источник';status='Архив / пробы'
    if p.startswith('design/2d/halloween/'):
        if '/costumes/rework-v8/zhuzha/' in p:
            title='Жужа / плащ v8 / '+stem;species='Жужа';status='Кандидат / вариант';role='Изображение' if stem.startswith('preview-') else 'Отдельный слой'
        if stem in {'zhuzha-vampire-fit-v8','zhuzha-vampire-current-v8'}:
            title='Жужа / плащ вокруг спины v8'+(' / до и после' if 'fit' in stem else ' / новая примерка');role='Лист / сравнение';status='Кандидат / вариант';species='Жужа'
        if '/sources/rework-v8/' in p:role='Лист / источник';status='Архив / пробы'
        if '/costumes/rework-v5/zhuzha/' in p or stem in {'zhuzha-vampire-v5','zhuzha-vampire-current-v7'}:status='Требует доработки'
    if p.startswith('design/2d/halloween/'):
        jack_names={'deco_jack_1':'Добрая улыбка','deco_jack_2':'Хитрый прищур','deco_jack_3':'Сонная','deco_jack_4':'Удивлённая'}
        if '/deco/' in p and stem in jack_names:
            title='Тыква-фонарь / '+jack_names[stem];role='Изображение';status='Кандидат / вариант';style='Медовый кристалл';season='Хеллоуин'
        if stem=='jack-decor-v1':title='Тыквы-фонари / все четыре выражения';role='Лист / сравнение';status='Кандидат / вариант'
        if '/sources/jack-decor-v1/' in p:role='Лист / источник';status='Архив / пробы'
        if '/costumes/rework-v8/zhuzha/' in p:status='Одобрено'
    if p.startswith('design/2d/halloween/'):
        final_event_titles={'trick/door.png':'Дверь ночного улья / для пчелы-гостя','trick/basket.png':'Тыквенная корзинка / сладости и леденец','ui/event_header.png':'Тыквенная ночь / шапка дорожки наград'}
        rel=p.removeprefix('design/2d/halloween/')
        if rel in final_event_titles:
            title=final_event_titles[rel];role='Изображение';status='Кандидат / вариант';style='Медовый кристалл';season='Хеллоуин'
        if stem=='event-final-v1':title='Тыквенная ночь / дверь, корзинка и шапка';role='Лист / сравнение';status='Кандидат / вариант'
        if '/sources/event-final-v1/' in p:role='Лист / источник';status='Архив / пробы'
    if p == 'design/2d/halloween/env/hive_bg_autumn.png':
        title='Улей / осенний дневной фон';role='Изображение';season='Осень';style='Медовый кристалл';status='Кандидат / вариант'
    if p == 'design/2d/halloween/sources/autumn-hive-v1.png':
        title='Осенний улей / исходная генерация';role='Лист / источник';season='Осень';status='Архив / пробы'
    if p.startswith('design/art/glyph-contrast-options-v2/'):
        style='Медовый кристалл / умеренный контраст';status='Кандидат / вариант'
        glyph_labels={'cell0':'солнце','cell1':'сердце','cell2':'цветок','cell3':'капля','cell4':'лист','cell_wild':'джокер','bomb':'бомба','cell_pumpkin':'тыква'}
        if '/normal/' in p or '/halloween/' in p:
            seasonal='/halloween/' in p;title=('Halloween' if seasonal else 'Обычный набор')+' / мягче v2 / '+glyph_labels.get(stem,stem);role='Изображение';season='Хеллоуин' if seasonal else 'Базовый'
        if stem=='compare':title='Глифы / насыщенные цвета и умеренный контраст / сравнение v2';role='Лист / сравнение'
        if '/sources/' in p:role='Лист / источник';status='Архив / пробы'
    if p.startswith('design/art/glyph-contrast-options-v2/') and '/sources/' not in p:
        status='Одобрено'
    if p.startswith('design/art/glyph-contrast-options-v3/'):
        style='Медовый кристалл / заметнее грани';status='Кандидат / вариант'
        labels_v3={'cell0':'солнце','cell1':'сердце','cell2':'цветок','cell3':'капля','cell4':'лист','cell_wild':'джокер','bomb':'бомба','cell_pumpkin':'тыква'}
        if '/normal/' in p or '/halloween/' in p:
            seasonal='/halloween/' in p;title=('Halloween' if seasonal else 'Обычный набор')+' / заметнее грани v3 / '+labels_v3.get(stem,stem);role='Изображение';season='Хеллоуин' if seasonal else 'Базовый'
        if stem=='compare':title='Глифы / одобренный и чуть заметнее грани v3';role='Лист / сравнение'
        if '/sources/' in p:role='Лист / источник';status='Архив / пробы'
    if p.startswith('design/art/glyph-contrast-options-v3/') and '/sources/' not in p:status='Одобрено'
    if p == 'design/art/glyph-styles-final-comparison/compare-six.png':
        title='Глифы / текущий, мягче и гранёный / шесть наборов';role='Лист / сравнение';style='Сравнение стилей';status='На просмотре'
    if p.startswith('design/2d/halloween/trick/'):
        labels = {'basket_full':'Полная корзинка-тыква', 'basket_empty':'Пустая корзинка-тыква', 'candy_1':'Леденец на палочке', 'candy_2':'Завёрнутая конфета', 'candy_3':'Candy corn', 'candy_4':'Шоколадка', 'candy_5':'Мармеладная тыква', 'candy_6':'Медовая капля-конфета', 'door_glow':'Свет из проёма', 'sparkle_burst':'Вспышка радости', 'trick_bg':'Ночное крыльцо / фон окна', 'preview':'Сладость или гадость / полный набор анимации', 'alpha_review':'Сладость или гадость / кромки на двух фонах', 'scene_preview':'Сладость или гадость / композиция без гостя', 'door_aperture_mask':'Дверь / маска проёма'}
        title=labels.get(stem,title)
        if stem.startswith('door_open_'):
            title='Открытие двери / кадр '+stem.rsplit('_',1)[-1]
        if stem in labels or stem.startswith('door_open_'):
            category='Фоны и грядки' if stem=='trick_bg' else 'Декор';status='На просмотре';role='Изображение'
        if stem in ('preview','alpha_review','scene_preview'):
            category='Макеты и проверки';role='Лист / сравнение'
        if stem=='door_aperture_mask':role='Маска / технический слой'
        if '/sources-animation-v1/' in p:role='Лист / источник';status='Архив / пробы'
    if p == 'design/2d/halloween/env/garden_bg_night_v2.png':
        title='Ночной сад v2 / листва и фонарики';category='Фоны и грядки';status='На просмотре'
    if p.startswith('design/art/glyph-contrast-options-v4/'):
        style='Яркие · спокойнее';status='В сборку';category='Глифы и соты'
        if stem=='compare':title='Яркие (1.5), спокойнее v4 и Мягкий кристалл';role='Лист / сравнение'
        if '/sources/' in p:role='Лист / источник';status='Архив / пробы'
    if p.startswith(('design/art/glyph-library-only-v1/','design/art/glyph-contrast-options-v3/')):
        status='Только библиотека'
    if p == 'design/art/glyph-styles-selection-v1/all-styles.png':
        title='Глифы / решение: 1,3,4,5,7 в сборку; 2,6 в библиотеку';role='Лист / сравнение';status='Выбор владельца';category='Глифы и соты'
    if p.startswith('design/2d/halloween/intro-v1/'):
        status='Только библиотека / не утверждено'
        title='Интро v1 / отклонённый черновик / '+title
    if p.startswith('design/2d/halloween/intro-gemini-brief-v1/'):
        status='Референс для Gemini'
        title='Пакет для Gemini / '+title
    return dict(title=title,category=category,role=role,style=style,season=season,status=status,species=species,accessory=accessory)

SHELVES = {'main':'Коллекция','review':'На выбор','fittings':'Примерки','repair':'Доработать','technical':'Исходники и слои','archive':'Архив'}

def organize(record):
    """Conservative navigation labels; never delete or claim runtime usage."""
    p=record['path'].lower();stem=Path(p).stem
    if p.startswith('design/concepts/minigames/gift-shelves/'):
        names={'gameplay':'Полки подарков / лавка Жужи','match-action':'Полки подарков / тройка и комбо','preview':'Полки подарков / игровые арты'}
        record.update(category='Макеты и проверки',season='Зима / Рождество',style='Медовый кристалл / игровой арт',status='На просмотре',title=names.get(stem,stem),role='Лист / сравнение' if stem=='preview' else 'Изображение')
    if p.startswith('design/concepts/minigames/cocoa-sort/'):
        names={'winter-level-1':'Какао-сорт / зимний старт','winter-level-2-pour':'Какао-сорт / переливание','summer-nectar':'Нектар-сорт / летние баночки','preview':'Какао-сорт / зима и лето'}
        record.update(category='Макеты и проверки',season='Лето' if stem=='summer-nectar' else 'Зима / Рождество',style='Медовый кристалл / игровой арт',status='На просмотре',title=names.get(stem,stem),role='Лист / сравнение' if stem=='preview' else 'Изображение')
    if p.startswith('design/concepts/minigames/cocoa-sort/ui-options-v3/'):
        if stem=='c-cafe':record.update(status='Одобрено',title='Какао-сорт / C / выбранная основа — лавка Жужи')
        elif stem in {'a-blueberry','b-honey-light'}:record.update(status='Черновик',title='Какао-сорт / '+('A / черничный' if stem=='a-blueberry' else 'B / светлый медовый')+' / черновик')
    if p.startswith('design/hive-run/'):
        record.update(category='Макеты и проверки',season='Все сезоны',style='Медовый кристалл / Classic',status='На просмотре',title='Королевская квота / '+stem,role='Лист / сравнение' if stem=='overview' else 'Изображение')
    if p.startswith('design/concepts/minigames/hexa-stacks/'):
        names={'start':'Медовые стопки / начало уровня','after-clear':'Медовые стопки / очистка и снятие льда','win':'Медовые стопки / цель достигнута','preview':'Медовые стопки / играбельный уровень'}
        record.update(category='Макеты и проверки',season='Зима / Рождество',style='Черничный интерфейс / игровой прототип',status='На просмотре',title=names.get(stem,stem),role='Лист / сравнение' if stem=='preview' else 'Проверка в игре')
    if p.startswith('design/concepts/minigames/hexa-stacks/art-v1/'):
        record.update(category='Макеты и проверки',season='Зима / Рождество',style='Медовый кристалл / арт-концепт',status='На просмотре',title='Медовые стопки / художественное оформление v1',role='Изображение')
    if p.startswith('design/concepts/minigames/ornaments/'):
        names={'gameplay':'Ёлочные игрушки / постановка игрушки','merge-combo':'Ёлочные игрушки / слияние и комбо','toy-chain':'Ёлочные игрушки / шесть уровней и джокер','star-and-result':'Ёлочные игрушки / звезда и результат','play-sequence':'Ёлочные игрушки / игровые кадры'}
        record.update(category='Макеты и проверки',season='Зима / Рождество',style='Медовый кристалл',status='На просмотре',title=names.get(stem,stem),role='Лист / сравнение' if stem in {'play-sequence','toy-chain','merge-combo','star-and-result'} else 'Изображение')
    if p.startswith('design/concepts/minigames/gift-sort/'):
        names={'a-linen-sacks':'Сортировка подарков / A / тканевые мешки','b-wooden-sleighs':'Сортировка подарков / B / деревянные санки','c-sacks-on-sleighs':'Сортировка подарков / C / мешки на санках','result':'Сортировка подарков / результат смены','compare':'Сортировка подарков / три арт-направления'}
        record.update(category='Макеты и проверки',season='Зима / Рождество',style='Медовый кристалл',status='На просмотре',title=names.get(stem,stem),role='Лист / сравнение' if stem=='compare' else 'Изображение')
    if p.startswith('design/concepts/minigames/garland/'):
        names={'preview':'Гирлянда / общий концепт','garland-easy':'Гирлянда / лёгкий уровень','garland-medium':'Гирлянда / средний уровень','garland-progress':'Гирлянда / подключение лампочек','garland-solved':'Гирлянда / все лампочки горят','garland-victory':'Гирлянда / победа с Жужей'}
        record.update(category='Макеты и проверки',season='Зима / Рождество',style='Медовый кристалл / черничный интерфейс',status='На просмотре',title=names.get(stem,stem),role='Лист / сравнение' if stem=='preview' else 'Проверка в игре')
    if p.startswith('assets/telegram/') or p.startswith('design/art/telegram-channel-assets-v1/'):
        record.update(category='Макеты и проверки',season='Все сезоны',style='Buzzle / Telegram',status='На просмотре',title='Telegram / '+stem,role='Лист / сравнение' if stem=='preview' else 'Изображение')
        if '/sources/' in p:record.update(role='Исходник / сырой',status='Исходник')
    if p.startswith('design/art/google-play-assets-v2/'):
        record.update(category='Макеты и проверки',season='Все сезоны',style='Buzzle / Google Play',status='На просмотре',title='Google Play / актуальные скриншоты / '+stem,role='Лист / сравнение' if stem in {'preview','source-review'} else 'Изображение')
        if '/sources/' in p:record.update(role='Исходник / сырой',status='Исходник')
    if p.startswith('assets/store/') or p.startswith('design/art/google-play-assets-v1/'):
        record.update(category='Макеты и проверки',season='Все сезоны',style='Buzzle / Google Play',status='На просмотре',title='Google Play / '+stem,role='Лист / сравнение' if stem in {'preview','screenshots-review'} else 'Изображение')
        if stem=='feature-source':record.update(role='Исходник / сырой',status='Исходник')
    if p.startswith('assets/art/cocoa/') or p.startswith('design/concepts/minigames/cocoa-sort/assets-cafe-v1/'):
        labels={'mug_glass':'Какао-сорт / стеклянная кружка','shelf_wood':'Какао-сорт / полка','background_cafe_winter':'Какао-сорт / зимняя лавка','title_plaque':'Какао-сорт / заголовок','preview':'Какао-сорт C / все отдельные ассеты','mug_layers_example':'Какао-сорт C / проверка слоёв'}
        record.update(category='Ресурсы и инструменты',season='Зима / Рождество',style='Медовый кристалл / кафе C',status='На просмотре',title=labels.get(stem,'Какао-сорт / '+stem),role='Лист / сравнение' if stem=='preview' else 'Изображение')
        if stem=='mug_layers_example':record.update(role='Проверка в игре')
        elif '/sources/' in p:record.update(role='Исходник / сырой',status='Исходник')
        elif p.endswith('.webp'):record.update(role='Экспорт для игры',status='Экспорт / кандидат')
        if stem=='mug_liquid_mask':record.update(role='Исходник / сырой',status='Исходник')
    if p.startswith('design/art/winter-plants-v3/'):
        names={'hellebore_seeds':'Морозник / пакетик семян','poinsettia_seeds':'Пуансеттия / пакетик семян','preview':'Зимний сад / семена для лавки'}
        record.update(category='Растения',season='Зима / Рождество',style='Медовый кристалл / зимний сад',status='На просмотре',title=names.get(stem,stem),role='Лист / сравнение' if stem=='preview' else 'Изображение')
        if '/sources/' in p:record.update(role='Исходник / сырой',status='Исходник')
        elif p.endswith('.webp'):record.update(role='Экспорт для игры',status='Экспорт / кандидат')
    if p.startswith('design/art/winter-plants-v2/'):
        names={'hellebore_sprout':'Морозник / росток','hellebore_bud':'Морозник / закрытый бутон','poinsettia_sprout':'Пуансеттия / росток','poinsettia_bud':'Пуансеттия / ранние прицветники','preview':'Зимние растения / цепочки роста'}
        record.update(category='Растения',season='Зима / Рождество',style='Медовый кристалл / зимний сад',status='На просмотре',title=names.get(stem,stem),role='Лист / сравнение' if stem=='preview' else 'Изображение')
        if '/sources/' in p:record.update(role='Исходник / сырой',status='Исходник')
        elif p.endswith('.webp'):record.update(role='Экспорт для игры',status='Экспорт / кандидат')
    if p.startswith('design/art/winter-plants-v1/'):
        names={'hellebore_bloom':'Морозник / взрослое растение','poinsettia_bloom':'Пуансеттия / взрослое растение','preview':'Зимние растения / сравнение с существующим садом'}
        record.update(category='Растения',season='Зима / Рождество',style='Медовый кристалл / зимний сад',status='На просмотре',title=names.get(stem,stem),role='Лист / сравнение' if stem=='preview' else 'Изображение')
        if '/sources/' in p:record.update(role='Исходник / сырой',status='Исходник')
        elif p.endswith('.webp'):record.update(role='Экспорт для игры',status='Экспорт / кандидат')
    if p.startswith('design/art/winter-gift-sled-v1/'):
        record.update(category='Декор',season='Зима / Рождество',style='Медовый кристалл',status='На просмотре',title='Санки с подарками',role='Лист / сравнение' if stem=='preview' else 'Изображение')
        if '/sources/' in p:record.update(role='Исходник / сырой',status='Исходник')
        elif p.endswith('.webp'):record.update(role='Экспорт для игры',status='Экспорт / кандидат')
    if p.startswith('design/art/winter-decor-v7/'):
        names={'deco_winter_mailbox':'Зимний почтовый ящик v7','deco_winter_gingerbread_house':'Зимний пряничный домик v7','preview':'Почтовый ящик и домик / до и после','collection':'Четыре зимних украшения / общий стиль'}
        record.update(category='Декор',season='Зима / Рождество',style='Медовый кристалл',status='На просмотре',title=names.get(stem,stem),role='Лист / сравнение' if stem in {'preview','collection'} else 'Изображение')
        if '/sources/' in p:record.update(role='Исходник / сырой',status='Исходник')
        elif p.endswith('.webp'):record.update(role='Экспорт для игры',status='Экспорт / кандидат')
    if p.startswith('design/art/winter-decor-v6/'):
        names={'deco_winter_snowman':'Зимний снеговик v6 / простой декор','deco_winter_lantern':'Зимний фонарный столб v6 / простой декор','preview':'Снеговик и фонарный столб / до и после','collection':'Четыре зимних украшения / общий стиль'}
        record.update(category='Декор',season='Зима / Рождество',style='Медовый кристалл',status='На просмотре',title=names.get(stem,stem),role='Лист / сравнение' if stem in {'preview','collection'} else 'Изображение')
        if '/sources/' in p:record.update(role='Исходник / сырой',status='Исходник')
        elif p.endswith('.webp'):record.update(role='Экспорт для игры',status='Экспорт / кандидат')
    if p.startswith('design/art/winter-decor-v5/'):
        names={'deco_winter_tree':'Зимняя ёлочка v5 / простой декор','deco_winter_garland':'Зимняя гирлянда v5 / простой декор','preview':'Зимний декор / до и после','dark-preview':'Зимний декор / ночной фон'}
        record.update(category='Декор',season='Зима / Рождество',style='Медовый кристалл',status='На просмотре',title=names.get(stem,stem),role='Лист / сравнение' if stem in {'preview','dark-preview'} else 'Изображение')
        if '/sources/' in p:record.update(role='Исходник / сырой',status='Исходник')
        elif p.endswith('.webp'):record.update(role='Экспорт для игры',status='Экспорт / кандидат')
    if p.startswith('design/art/winter-season-icons-v1/'):
        names={'winter':'Выбор сезона / Зима','christmas':'Выбор сезона / Рождество','preview':'Иконки сезонов / общий лист'}
        record.update(category='Иконки и промо',season='Зима / Рождество',style='Медовый кристалл',status='На просмотре',title=names.get(stem,stem),role='Лист / сравнение' if stem=='preview' else 'Изображение')
        if '/sources/' in p:record.update(role='Исходник / сырой',status='Исходник')
        elif p.endswith('.webp'):record.update(role='Экспорт для игры',status='Экспорт / кандидат')
    if p.startswith('design/art/winter-season-cards-v2/'):
        names={'winter_card':'Зимняя карточка v2 / простой декор','christmas_card':'Рождественская карточка v2 / простой декор','preview':'Сезонные карточки v2 / общий лист','compare':'Сезонные карточки / до и после'}
        record.update(category='Фоны и грядки',season='Зима / Рождество',style='Медовый кристалл',status='На просмотре',title=names.get(stem,stem),role='Лист / сравнение' if stem in {'preview','compare'} else 'Изображение')
        if '/sources/' in p:record.update(role='Исходник / сырой',status='Исходник')
        elif p.endswith('.webp'):record.update(role='Экспорт для игры',status='Экспорт / кандидат')
    if p.startswith('design/art/winter-season-cards-v1/'):
        names={'winter_card':'Зимняя сезонная карточка','christmas_card':'Рождественская сезонная карточка','preview':'Сезонные карточки / общий лист'}
        record.update(category='Фоны и грядки',season='Зима / Рождество',style='Медовый кристалл',status='На просмотре',title=names.get(stem,stem),role='Лист / сравнение' if stem=='preview' else 'Изображение')
        if '/sources/' in p:record.update(role='Исходник / сырой',status='Исходник')
        elif p.endswith('.webp'):record.update(role='Экспорт для игры',status='Экспорт / кандидат')
    if p.startswith('design/art/winter-streak-v1/'):
        names={'winter_streak_flame':'Зимняя серия / огонёк','winter_streak_freeze':'Зимняя серия / заморозка','preview':'Зимняя серия / сравнение'}
        record.update(category='Ресурсы и инструменты',season='Зима / Рождество',style='Медовый кристалл',status='На просмотре',title=names.get(stem,stem),role='Лист / сравнение' if stem=='preview' else 'Изображение')
        if '/sources/' in p:record.update(role='Исходник / сырой',status='Исходник')
        elif p.endswith('.webp'):record.update(role='Экспорт для игры',status='Экспорт / кандидат')
    if p.startswith('design/art/winter-collection-icons-v1/'):
        names={'winter_shop':'Зимняя Лавка','winter_album':'Зимний Альбом','preview':'Зимние Лавка и Альбом / сравнение'}
        record.update(category='Ресурсы и инструменты',season='Зима / Рождество',style='Медовый кристалл',status='На просмотре',title=names.get(stem,stem),role='Лист / сравнение' if stem=='preview' else 'Изображение')
        if '/sources/' in p:record.update(role='Исходник / сырой',status='Исходник')
        elif p.endswith('.webp'):record.update(role='Экспорт для игры',status='Экспорт / кандидат')
    if p.startswith('design/art/winter-boosters-v1/'):
        names={'boost_winter_bomb':'Зимний усилитель / бомба','boost_winter_shuffle':'Зимний усилитель / перемешивание','boost_winter_moves':'Зимний усилитель / +3 хода','preview':'Зимние усилители / сравнение'}
        record.update(category='Награды и усилители',season='Зима / Рождество',style='Медовый кристалл',status='На просмотре',title=names.get(stem,stem),role='Лист / сравнение' if stem=='preview' else 'Изображение')
        if '/sources/' in p:record.update(role='Исходник / сырой',status='Исходник')
        elif p.endswith('.webp'):record.update(role='Экспорт для игры',status='Экспорт / кандидат')
    if p.startswith('design/art/winter-combs-v1/'):
        names={'comb_winter_full':'Зимняя сота улья / с мёдом','comb_winter_empty':'Зимняя сота улья / пустая','comb_winter_locked':'Зимняя сота улья / закрытая','preview':'Зимние соты / сравнение','grid':'Зимние соты / примерка сетки'}
        record.update(category='Глифы и соты',season='Зима / Рождество',style='Медовый кристалл',status='На просмотре',title=names.get(stem,stem),role='Лист / сравнение' if stem in {'preview','grid'} else 'Изображение')
        if '/sources/' in p:record.update(role='Исходник / сырой',status='Исходник')
        elif p.endswith('.webp'):record.update(role='Экспорт для игры',status='Экспорт / кандидат')
    if p.startswith('design/art/ornaments-sprite-fit-v1/'):
        titles={'preview':'Ёлочные игрушки / примерка до и после слияния','before':'Ёлочные игрушки / перед ходом','after':'Ёлочные игрушки / после слияния'}
        record.update(category='Макеты и проверки',season='Зима / Рождество',style='Медовый кристалл',status='На просмотре',title=titles.get(stem,stem),role='Лист / сравнение' if stem=='preview' else 'Изображение')
    if p.startswith('design/art/winter-ornament-sprites-v3/'):
        titles={'preview':'Ёлочные игрушки / все шесть игрушек на сотах','pinecone':'Ёлочные игрушки / шишка','bauble':'Ёлочные игрушки / шарик','bell':'Ёлочные игрушки / колокольчик','snowflake':'Ёлочные игрушки / снежинка','gingerbee':'Ёлочные игрушки / пряник-пчёлка','goldstar':'Ёлочные игрушки / золотая звезда'}
        record.update(category='Глифы и соты',season='Зима / Рождество',style='Медовый кристалл',status='На просмотре',title=titles.get(stem,stem),role='Лист / сравнение' if stem=='preview' else 'Изображение')
        if '/sources/' in p:record.update(role='Исходник / сырой',status='Исходник')
        elif p.endswith('.webp'):record.update(role='Экспорт для игры',status='Экспорт / кандидат')
    if p.startswith('design/art/winter-ornament-sprites-v2/'):
        titles={'preview':'Ёлочные игрушки / первые четыре спрайта на сотах','pinecone':'Ёлочные игрушки / шишка','bauble':'Ёлочные игрушки / шарик','bell':'Ёлочные игрушки / колокольчик','snowflake':'Ёлочные игрушки / снежинка'}
        record.update(category='Глифы и соты',season='Зима / Рождество',style='Медовый кристалл',status='На просмотре',title=titles.get(stem,stem),role='Лист / сравнение' if stem=='preview' else 'Изображение')
        if '/sources/' in p:record.update(role='Исходник / сырой',status='Исходник')
        elif p.endswith('.webp'):record.update(role='Экспорт для игры',status='Экспорт / кандидат')
    if p.startswith('design/art/winter-ornament-sprites-v1/'):
        titles={'preview':'Ёлочные игрушки / шишка и шарик на сотах','pinecone':'Ёлочные игрушки / шишка','bauble':'Ёлочные игрушки / шарик'}
        record.update(category='Глифы и соты',season='Зима / Рождество',style='Медовый кристалл',status='На просмотре',title=titles.get(stem,stem),role='Лист / сравнение' if stem=='preview' else 'Изображение')
        if '/sources/' in p:record.update(role='Исходник / сырой',status='Исходник')
        elif p.endswith('.webp'):record.update(role='Экспорт для игры',status='Экспорт / кандидат')
    if p.startswith('design/art/winter-garden-beds-v2/'):
        titles={'preview':'Зимняя грядка / до и после полива','bed-winter-dry':'Зимняя грядка / сухая','bed-winter-wet':'Зимняя грядка / политая / общая рамка'}
        record.update(category='Фоны и грядки',season='Зима / Рождество',style='Медовый кристалл',status='На просмотре',title=titles.get(stem,stem),role='Лист / сравнение' if stem=='preview' else 'Изображение')
        if p.endswith('.webp'):record.update(role='Экспорт для игры',status='Экспорт / кандидат')
    if p.startswith('design/art/winter-garden-fit-v1/'):
        titles={'preview':'Зимний сад / день и вечер','garden-day-360':'Зимний сад / день / 360','garden-evening-390':'Зимний сад / вечер / 390'}
        record.update(category='Макеты и проверки',season='Зима / Рождество',style='Медовый кристалл',status='На просмотре',title=titles.get(stem,stem),role='Лист / сравнение' if stem=='preview' else 'Изображение')
    if p.startswith('design/art/winter-garden-tools-v1/'):
        names={'garden_winter_can':'Зимний сад / лейка','garden_winter_shovel':'Зимний сад / совок','preview':'Зимние инструменты / сравнение'}
        record.update(category='Ресурсы и инструменты',season='Зима / Рождество',style='Медовый кристалл',status='На просмотре',title=names.get(stem,stem),role='Лист / сравнение' if stem=='preview' else 'Изображение')
        if '/sources/' in p:record.update(role='Исходник / сырой',status='Исходник')
        elif p.endswith('.webp'):record.update(role='Экспорт для игры',status='Экспорт / кандидат')
    if p.startswith('design/art/winter-rewards-v2/'):
        names={'reward_winter_honey':'Зимняя награда / мёд','reward_winter_pollen':'Зимняя награда / пыльца','reward_winter_nectar':'Зимняя награда / нектар','reward_winter_jelly':'Зимняя награда / маточное молочко','reward_winter_fragment':'Зимняя награда / фрагмент','preview':'Зимние награды / нектар, молочко и фрагмент','all-rewards':'Пять праздничных наград / общий лист'}
        record.update(category='Награды и усилители',season='Зима / Рождество',style='Медовый кристалл',status='На просмотре',title=names.get(stem,stem),role='Лист / сравнение' if stem in {'preview','all-rewards'} else 'Изображение')
        if '/sources/' in p:record.update(role='Исходник / сырой',status='Исходник')
        elif p.endswith('.webp'):record.update(role='Экспорт для игры',status='Экспорт / кандидат')
    if p.startswith('design/art/winter-rewards-v1/'):
        names={'reward_winter_honey':'Зимняя награда / мёд','reward_winter_pollen':'Зимняя награда / пыльца','preview':'Зимние награды / мёд и пыльца'}
        record.update(category='Награды и усилители',season='Зима / Рождество',style='Медовый кристалл',status='На просмотре',title=names.get(stem,stem),role='Лист / сравнение' if stem=='preview' else 'Изображение')
        if '/sources/' in p:record.update(role='Исходник / сырой',status='Исходник')
        elif p.endswith('.webp'):record.update(role='Экспорт для игры',status='Экспорт / кандидат')
    if p.startswith('design/2d/winter-bees-v6/'):
        titles={'preview':'Зимние пчёлы / вид сверху','turnaround':'Зимние пчёлы / шесть ракурсов'}
        species='Снежная пчёлка' if 'snow' in stem else 'Пряничная пчёлка'
        angle='Сверху' if stem.endswith('top') else 'Три четверти сзади' if stem.endswith('q3-back') else 'Сзади' if stem.endswith('back') else 'Профиль' if stem.endswith('side') else 'Три четверти' if 'q3-front' in stem else 'Анфас'
        record.update(category='Пчёлы',season='Зима / Рождество',style='Медовый кристалл',status='На просмотре',title=titles.get(stem,species+' / '+angle),role='Лист / сравнение' if stem in titles else 'Изображение')
        if '/sources/' in p:record.update(role='Исходник / сырой',status='Исходник')
        elif p.endswith('.webp'):record.update(role='Экспорт для игры',status='Экспорт / кандидат')
    if p.startswith('design/2d/winter-bees-v5/'):
        titles={'preview':'Зимние пчёлы / три четверти сзади','turnaround':'Зимние пчёлы / пять ракурсов'}
        species='Снежная пчёлка' if 'snow' in stem else 'Пряничная пчёлка'
        angle='Три четверти сзади' if stem.endswith('q3-back') else 'Сзади' if stem.endswith('back') else 'Профиль' if stem.endswith('side') else 'Три четверти' if 'q3-front' in stem else 'Анфас'
        record.update(category='Пчёлы',season='Зима / Рождество',style='Медовый кристалл',status='На просмотре',title=titles.get(stem,species+' / '+angle),role='Лист / сравнение' if stem in titles else 'Изображение')
        if '/sources/' in p:record.update(role='Исходник / сырой',status='Исходник')
        elif p.endswith('.webp'):record.update(role='Экспорт для игры',status='Экспорт / кандидат')
    if p.startswith('design/2d/winter-bees-v4/'):
        titles={'preview':'Зимние пчёлы / вид сзади','turnaround':'Зимние пчёлы / четыре ракурса'}
        species='Снежная пчёлка' if 'snow' in stem else 'Пряничная пчёлка'
        angle='Сзади' if stem.endswith('back') else 'Профиль' if stem.endswith('side') else 'Три четверти' if 'q3-front' in stem else 'Анфас'
        record.update(category='Пчёлы',season='Зима / Рождество',style='Медовый кристалл',status='На просмотре',title=titles.get(stem,species+' / '+angle),role='Лист / сравнение' if stem in titles else 'Изображение')
        if '/sources/' in p:record.update(role='Исходник / сырой',status='Исходник')
        elif p.endswith('.webp'):record.update(role='Экспорт для игры',status='Экспорт / кандидат')
    if p.startswith('design/2d/winter-bees-v3/'):
        names={'bee-gingerbread-front':'Пряничная пчёлка / анфас','bee-gingerbread-q3-front':'Пряничная пчёлка / три четверти','bee-gingerbread-side':'Пряничная пчёлка / профиль','profile-compare':'Пряничная пчёлка / геометрия профиля','preview':'Пряничная пчёлка / три ракурса','both-bees':'Снежная и пряничная / сравнение трёх ракурсов'}
        record.update(category='Пчёлы',season='Зима / Рождество',style='Медовый кристалл',status='На просмотре',title=names.get(stem,stem),role='Лист / сравнение' if stem in {'preview','profile-compare','both-bees'} else 'Изображение')
        if '/sources/' in p:record.update(role='Исходник / сырой',status='Исходник')
        elif p.endswith('.webp'):record.update(role='Экспорт для игры',status='Экспорт / кандидат')
    if p.startswith('design/2d/winter-bees-v2/'):
        names={'bee-snow-front':'Снежная пчёлка / анфас','bee-snow-q3-front':'Снежная пчёлка / три четверти','bee-snow-side':'Снежная пчёлка / профиль','profile-compare':'Снежная пчёлка / геометрия профиля','preview':'Снежная пчёлка / три ракурса'}
        record.update(category='Пчёлы',season='Зима / Рождество',style='Медовый кристалл',status='На просмотре',title=names.get(stem,stem),role='Лист / сравнение' if stem in {'preview','profile-compare'} else 'Изображение')
        if '/sources/' in p:record.update(role='Исходник / сырой',status='Исходник')
        elif p.endswith('.webp'):record.update(role='Экспорт для игры',status='Экспорт / кандидат')
    if p.startswith('design/2d/winter-wardrobe-v8/'):
        names={'zhuzha-winter-festive-set-front':'Жужа / венок и бант / анфас','zhuzha-winter-festive-set-q3-front':'Жужа / венок и бант / три четверти','zhuzha-winter-festive-set-side':'Жужа / венок и бант / профиль','profile-compare':'Праздничный комплект / сравнение профиля','preview':'Венок и бант вместе / три ракурса'}
        record.update(category='Наряды',season='Зима / Рождество',style='Медовый кристалл',status='На просмотре',title=names.get(stem,stem),role='Лист / сравнение' if stem in {'preview','profile-compare'} else 'Изображение')
        if '/sources/' in p:record.update(role='Исходник / сырой',status='Исходник')
        elif p.endswith('.webp'):record.update(role='Экспорт для игры',status='Экспорт / кандидат')
    if p.startswith('design/2d/winter-wardrobe-v7/'):
        names={'zhuzha-winter-bow-front':'Жужа / праздничный бант / анфас','zhuzha-winter-bow-q3-front':'Жужа / праздничный бант / три четверти','zhuzha-winter-bow-side':'Жужа / праздничный бант / профиль','profile-compare':'Бант / профиль рядом с исходной Жужей','preview':'Праздничный бант / три ракурса'}
        record.update(category='Наряды',season='Зима / Рождество',style='Медовый кристалл',status='На просмотре',title=names.get(stem,stem),role='Лист / сравнение' if stem in {'preview','profile-compare'} else 'Изображение')
        if '/sources/' in p:record.update(role='Исходник / сырой',status='Исходник')
        elif p.endswith('.webp'):record.update(role='Экспорт для игры',status='Экспорт / кандидат')
    if p.startswith('design/2d/winter-wardrobe-v6/'):
        names={'zhuzha-winter-wreath-front':'Жужа / хвойный венок / анфас','zhuzha-winter-wreath-q3-front':'Жужа / хвойный венок / три четверти','zhuzha-winter-wreath-side':'Жужа / хвойный венок / профиль','profile-compare':'Венок / профиль рядом с исходной Жужей','preview':'Хвойный венок / три ракурса'}
        record.update(category='Наряды',season='Зима / Рождество',style='Медовый кристалл',status='На просмотре',title=names.get(stem,stem),role='Лист / сравнение' if stem in {'preview','profile-compare'} else 'Изображение')
        if '/sources/' in p:record.update(role='Исходник / сырой',status='Исходник')
        elif p.endswith('.webp'):record.update(role='Экспорт для игры',status='Экспорт / кандидат')
    if p.startswith('design/2d/winter-wardrobe-v5/'):
        names={'zhuzha-winter-wreath-front':'Жужа / зимний хвойный венок / анфас','zhuzha-winter-bow-front':'Жужа / праздничный бант / анфас','preview':'Зимние наряды / венок и бант'}
        record.update(category='Наряды',season='Зима / Рождество',style='Медовый кристалл',status='На просмотре',title=names.get(stem,stem),role='Лист / сравнение' if stem=='preview' else 'Изображение')
        if '/sources/' in p:record.update(role='Исходник / сырой',status='Исходник')
        elif p.endswith('.webp'):record.update(role='Экспорт для игры',status='Экспорт / кандидат')
    if p.startswith('design/art/winter-decor-v4/'):
        names={'deco_winter_mailbox':'Зимний почтовый ящик','deco_winter_gingerbread_house':'Пряничный домик','preview':'Зимний декор / почта и пряничный домик'}
        record.update(category='Декор',season='Зима / Рождество',style='Медовый кристалл',status='На просмотре',title=names.get(stem,stem),role='Лист / сравнение' if stem=='preview' else 'Изображение')
        if '/sources/' in p:record.update(role='Исходник / сырой',status='Исходник')
        elif p.endswith('.webp'):record.update(role='Экспорт для игры',status='Экспорт / кандидат')
    if p.startswith('design/art/winter-garden-beds-v1/'):
        names={'bed-winter-dry':'Зимняя грядка / сухая','bed-winter-wet':'Зимняя грядка / политая','preview':'Зимние грядки / сравнение и растения'}
        record.update(category='Фоны и грядки',season='Зима / Рождество',style='Медовый кристалл',status='На просмотре',title=names.get(stem,stem),role='Лист / сравнение' if stem=='preview' else 'Изображение')
        if '/sources/' in p:record.update(role='Исходник / сырой',status='Исходник')
        elif p.endswith('.webp'):record.update(role='Экспорт для игры',status='Экспорт / кандидат')
    if p.startswith('design/2d/winter-bow-layer-v1/'):
        titles={'preview':'Праздничный бант / три ракурса','bow-front':'Бант / анфас','bow-q3-front':'Бант / три четверти','bow-side':'Бант / профиль'}
        record.update(category='Наряды',season='Зима / Рождество',style='Медовый кристалл',status='На просмотре',title=titles.get(stem,'Праздничный бант / '+stem),role='Лист / сравнение' if stem=='preview' or stem.startswith('fitting-') else 'Изображение')
        if '/sources/' in p:record.update(role='Исходник / сырой',status='Исходник')
        elif p.endswith('.webp'):record.update(role='Экспорт для игры',status='Экспорт / кандидат')
    if p.startswith('design/2d/winter-wardrobe-layers-review-v1/'):
        record.update(category='Наряды',season='Зима / Рождество',style='Медовый кристалл',status='На просмотре',title='Зимний гардероб / '+('12 слоёв и комплект' if stem=='overview' else stem),role='Лист / сравнение')
    if p.startswith('design/2d/winter-wreath-layer-v2/'):
        titles={'preview':'Рождественский венок / три ракурса','wreath-front':'Венок / анфас','wreath-q3-front':'Венок / три четверти','wreath-side':'Венок / профиль'}
        record.update(category='Наряды',season='Зима / Рождество',style='Медовый кристалл',status='На просмотре',title=titles.get(stem,'Рождественский венок / '+stem),role='Лист / сравнение' if stem=='preview' or stem.startswith('fitting-') else 'Изображение')
        if '/sources/' in p:record.update(role='Исходник / сырой',status='Исходник')
        elif p.endswith('.webp'):record.update(role='Экспорт для игры',status='Экспорт / кандидат')
    if p.startswith('design/2d/winter-wreath-layer-v1/'):
        titles={'wreath-front':'Рождественский венок / анфас / отдельный слой','wreath-fitted':'Рождественский венок / готовая посадка','antennae-overlay':'Рождественский венок / исходные усики','fitting-front':'Жужа / примерка рождественского венка','preview':'Рождественский венок / слой и примерка'}
        record.update(category='Наряды',season='Зима / Рождество',style='Медовый кристалл',status='На просмотре',title=titles.get(stem,stem),role='Лист / сравнение' if stem in {'preview','fitting-front'} else 'Изображение')
        if '/sources/' in p:record.update(role='Исходник / сырой',status='Исходник')
        elif p.endswith('.webp'):record.update(role='Экспорт для игры',status='Экспорт / кандидат')
    if p.startswith('design/2d/winter-antlers-layer-v2/'):
        titles={'preview':'Оленьи рожки / три ракурса','antlers-front':'Рожки / анфас','antlers-q3-front':'Рожки / три четверти','antlers-side':'Рожки / профиль'}
        record.update(category='Наряды',season='Зима / Рождество',style='Медовый кристалл',status='На просмотре',title=titles.get(stem,'Оленьи рожки / '+stem),role='Лист / сравнение' if stem=='preview' or stem.startswith('fitting-') else 'Изображение')
        if '/sources/' in p:record.update(role='Исходник / сырой',status='Исходник')
        elif p.endswith('.webp'):record.update(role='Экспорт для игры',status='Экспорт / кандидат')
    if p.startswith('design/2d/winter-santa-layer-v2/'):
        titles={'preview':'Рождественский колпак / три ракурса','santa-front':'Колпак / анфас','santa-q3-front':'Колпак / три четверти','santa-side':'Колпак / профиль'}
        record.update(category='Наряды',season='Зима / Рождество',style='Медовый кристалл',status='На просмотре',title=titles.get(stem,'Рождественский колпак / '+stem),role='Лист / сравнение' if stem=='preview' or stem.startswith('fitting-') else 'Изображение')
        if '/sources/' in p:record.update(role='Исходник / сырой',status='Исходник')
        elif p.endswith('.webp'):record.update(role='Экспорт для игры',status='Экспорт / кандидат')
    if p.startswith('design/2d/winter-antlers-layer-v1/'):
        titles={'antlers-front':'Оленьи рожки / анфас / отдельный слой','antlers-fitted':'Оленьи рожки / готовая посадка','antennae-overlay':'Оленьи рожки / исходные усики','fitting-front':'Жужа / примерка оленьих рожек','preview':'Оленьи рожки / слой и примерка'}
        record.update(category='Наряды',season='Зима / Рождество',style='Медовый кристалл',status='На просмотре',title=titles.get(stem,stem),role='Лист / сравнение' if stem in {'preview','fitting-front'} else 'Изображение')
        if '/sources/' in p:record.update(role='Исходник / сырой',status='Исходник')
        elif p.endswith('.webp'):record.update(role='Экспорт для игры',status='Экспорт / кандидат')
    if p.startswith('design/2d/winter-santa-layer-v1/'):
        titles={'santa-front':'Рождественский колпак / анфас / отдельный слой','hat-fitted':'Рождественский колпак / готовая посадка','antennae-overlay':'Рождественский колпак / исходные усики','fitting-front':'Жужа / примерка рождественского колпака','preview':'Рождественский колпак / слой и примерка'}
        record.update(category='Наряды',season='Зима / Рождество',style='Медовый кристалл',status='На просмотре',title=titles.get(stem,stem),role='Лист / сравнение' if stem in {'preview','fitting-front'} else 'Изображение')
        if '/sources/' in p:record.update(role='Исходник / сырой',status='Исходник')
        elif p.endswith('.webp'):record.update(role='Экспорт для игры',status='Экспорт / кандидат')
    if p.startswith('design/art/cocoa-effects-v1/'):
        titles={'steam_wisps':'Какао-сорт / лёгкий пар','completion_sparkles':'Какао-сорт / медовые блики','preview':'Какао-сорт / эффекты готового напитка'}
        record.update(category='Ресурсы и инструменты',season='Зима / Рождество',style='Медовый кристалл',status='На просмотре',title=titles.get(stem,'Какао-сорт / '+stem),role='Лист / сравнение' if stem=='preview' or stem.startswith('example_') else 'Изображение')
        if '/sources/' in p:record.update(role='Исходник / сырой',status='Исходник')
        elif p.endswith('.webp'):record.update(role='Экспорт для игры',status='Экспорт / кандидат')
    if p.startswith('design/art/winter-gift-carriers-v1/'):
        record.update(category='Ресурсы и инструменты',season='Зима / Рождество',style='Медовый кристалл',status='На просмотре',title='Пчёлы-носильщики / '+('12 примерок' if stem=='preview' else stem),role='Лист / сравнение' if stem=='preview' else 'Изображение')
        if '/sources/' in p:record.update(role='Исходник / сырой',status='Исходник')
        elif p.endswith('.webp'):record.update(role='Экспорт для игры',status='Экспорт / кандидат')
    if p.startswith('design/art/winter-gift-sort-layers-v1/'):
        titles={'preview':'Сортировка подарков / падение в мешок','drop-preview':'Сортировка подарков / анимация падения'}
        record.update(category='Ресурсы и инструменты',season='Зима / Рождество',style='Медовый кристалл',status='На просмотре',title=titles.get(stem,'Сортировка подарков / '+stem),role='Лист / сравнение' if stem in {'preview','drop-preview'} else 'Изображение')
        if stem.endswith('mouth-mask'):record.update(role='Исходник / сырой',status='Исходник')
        elif p.endswith('.webp') and stem!='drop-preview':record.update(role='Экспорт для игры',status='Экспорт / кандидат')
    if p.startswith('design/art/winter-gift-sort-targets-v2/'):
        titles={'sack_red':'Сортировка подарков / красный мешок','sack_green':'Сортировка подарков / зелёный мешок','sack_gold':'Сортировка подарков / золотой мешок','sack_blue':'Сортировка подарков / голубой мешок','all-pairs':'Сортировка подарков / четыре цветовые пары','preview':'Сортировка подарков / четыре мешка'}
        record.update(category='Ресурсы и инструменты',season='Зима / Рождество',style='Медовый кристалл',status='На просмотре',title=titles.get(stem,stem),role='Лист / сравнение' if stem in {'preview','all-pairs'} else 'Изображение')
        if '/sources/' in p:record.update(role='Исходник / сырой',status='Исходник')
        elif p.endswith('.webp'):record.update(role='Экспорт для игры',status='Экспорт / кандидат')
    if p.startswith('design/art/winter-gift-sort-targets-v1/'):
        titles={'sack_red':'Сортировка подарков / красный мешок','sack_green':'Сортировка подарков / зелёный мешок','preview':'Сортировка подарков / первые мешки'}
        record.update(category='Ресурсы и инструменты',season='Зима / Рождество',style='Медовый кристалл',status='На просмотре',title=titles.get(stem,stem),role='Лист / сравнение' if stem=='preview' else 'Изображение')
        if '/sources/' in p:record.update(role='Исходник / сырой',status='Исходник')
        elif p.endswith('.webp'):record.update(role='Экспорт для игры',status='Экспорт / кандидат')
    if p.startswith('design/art/winter-gift-sort-sprites-v2/'):
        titles={'gift_red':'Сортировка подарков / красная коробка','gift_green':'Сортировка подарков / зелёная коробка','gift_gold':'Сортировка подарков / золотая коробка','gift_blue':'Сортировка подарков / голубая коробка','preview':'Сортировка подарков / четыре цвета'}
        record.update(category='Ресурсы и инструменты',season='Зима / Рождество',style='Медовый кристалл',status='На просмотре',title=titles.get(stem,stem),role='Лист / сравнение' if stem=='preview' else 'Изображение')
        if '/sources/' in p:record.update(role='Исходник / сырой',status='Исходник')
        elif p.endswith('.webp'):record.update(role='Экспорт для игры',status='Экспорт / кандидат')
    if p.startswith('design/art/winter-gift-sort-sprites-v1/'):
        titles={'gift_red':'Сортировка подарков / красная коробка','gift_green':'Сортировка подарков / зелёная коробка','preview':'Сортировка подарков / первые коробки'}
        record.update(category='Ресурсы и инструменты',season='Зима / Рождество',style='Медовый кристалл',status='На просмотре',title=titles.get(stem,stem),role='Лист / сравнение' if stem=='preview' else 'Изображение')
        if '/sources/' in p:record.update(role='Исходник / сырой',status='Исходник')
        elif p.endswith('.webp'):record.update(role='Экспорт для игры',status='Экспорт / кандидат')
    if p.startswith('design/art/winter-chest-layers-v1/'):
        titles={'preview':'Зимний сундук / открытие','both-chests':'Зимний и рождественский сундуки / слои','base':'Зимний сундук / основание','lid':'Зимний сундук / крышка','closed':'Зимний сундук / закрыт','intermediate':'Зимний сундук / промежуточный кадр','open':'Зимний сундук / открыт'}
        record.update(category='Коробки и сундуки',season='Зима / Рождество',style='Медовый кристалл',status='На просмотре',title=titles.get(stem,stem),role='Лист / сравнение' if stem in {'preview','both-chests'} else 'Изображение')
        if '/sources/' in p:record.update(role='Исходник / сырой',status='Исходник')
        elif p.endswith('.webp'):record.update(role='Экспорт для игры',status='Экспорт / кандидат')
    if p.startswith('design/art/christmas-chest-layers-v1/'):
        titles={'preview':'Рождественский сундук / открытие','base':'Рождественский сундук / основание','lid':'Рождественский сундук / крышка','closed':'Рождественский сундук / закрыт','intermediate':'Рождественский сундук / промежуточный кадр','open':'Рождественский сундук / открыт'}
        record.update(category='Коробки и сундуки',season='Зима / Рождество',style='Медовый кристалл',status='На просмотре',title=titles.get(stem,stem),role='Лист / сравнение' if stem=='preview' else 'Изображение')
        if '/sources/' in p:record.update(role='Исходник / сырой',status='Исходник')
        elif p.endswith('.webp'):record.update(role='Экспорт для игры',status='Экспорт / кандидат')
    if p.startswith('design/art/winter-advent-v4/'):
        names={'gift-base':'Адвент / основание подарка','gift-lid':'Адвент / крышка подарка','preview':'Адвент / открытие подарка'}
        record.update(category='Коробки и сундуки',season='Зима / Рождество',style='Медовый кристалл',status='На просмотре',title=names.get(stem,stem),role='Лист / сравнение' if stem=='preview' else 'Изображение')
        if '/sources/' in p:record.update(role='Исходник / сырой',status='Исходник')
        elif p.endswith('.webp'):record.update(role='Экспорт для игры',status='Экспорт / кандидат')
    if p.startswith('design/art/winter-advent-v3/'):
        names={'advent-gift-open':'Адвент / раскрытый подарок','winter-reward-sparkle':'Зимняя награда / медовые искры','preview':'Адвент / раскрытый подарок и эффект'}
        record.update(category='Награды и усилители',season='Зима / Рождество',style='Медовый кристалл',status='На просмотре',title=names.get(stem,stem),role='Лист / сравнение' if stem=='preview' else 'Изображение')
        if '/sources/' in p:record.update(role='Исходник / сырой',status='Исходник')
        elif p.endswith('.webp'):record.update(role='Экспорт для игры',status='Экспорт / кандидат')
    if p.startswith('design/art/winter-advent-v2/'):
        names={'advent-pocket-closed':'Адвент / закрытый конверт-сота','advent-pocket-open':'Адвент / раскрытый конверт-сота','preview':'Адвент / окошко-конверт в двух состояниях'}
        record.update(category='Награды и усилители',season='Зима / Рождество',style='Медовый кристалл',status='На просмотре',title=names.get(stem,stem),role='Лист / сравнение' if stem=='preview' else 'Изображение')
        if '/sources/' in p:record.update(role='Исходник / сырой',status='Исходник')
        elif p.endswith('.webp'):record.update(role='Экспорт для игры',status='Экспорт / кандидат')
    if p.startswith('design/art/winter-advent-v1/'):
        names={'advent-gift-wrapped':'Адвент / подарок в упаковке','advent-postcard-zhuzha':'Адвент / открытка Жужи','preview':'Адвент / подарок и открытка'}
        record.update(category='Награды и усилители',season='Зима / Рождество',style='Медовый кристалл',status='На просмотре',title=names.get(stem,stem),role='Лист / сравнение' if stem=='preview' else 'Изображение')
        if '/sources/' in p:record.update(role='Исходник / сырой',status='Исходник')
        elif p.endswith('.webp'):record.update(role='Экспорт для игры',status='Экспорт / кандидат')
    if p.startswith('design/2d/winter-bees-v1/'):
        names={'bee-snow-front':'Снежная пчёлка / концепт A','bee-gingerbread-front':'Пряничная пчёлка / концепт B','preview':'Зимняя пчела / два направления'}
        record.update(category='Пчёлы',season='Зима / Рождество',style='Медовый кристалл',status='На просмотре',title=names.get(stem,stem),role='Лист / сравнение' if stem=='preview' else 'Изображение')
        if '/sources/' in p:record.update(role='Исходник / сырой',status='Исходник')
        elif p.endswith('.webp'):record.update(role='Экспорт для игры',status='Экспорт / кандидат')
    if p.startswith('design/2d/winter-wardrobe-v4/'):
        names={'preview':'Колпак и рожки / три ракурса','profile-compare':'Колпак и рожки / профиль рядом с исходной Жужей'}
        item='Рождественский колпак' if 'santa' in stem else 'Оленьи рожки'
        angle='Три четверти' if 'q3-front' in stem else 'Профиль' if stem.endswith('side') else 'Анфас'
        record.update(category='Наряды',season='Зима / Рождество',style='Медовый кристалл / зимний гардероб',status='На просмотре',title=names.get(stem,'Жужа / '+item+' / '+angle),role='Лист / сравнение' if stem in names else 'Изображение')
        if '/sources/' in p:record.update(role='Исходник / сырой',status='Исходник')
        elif p.endswith('.webp'):record.update(role='Экспорт для игры',status='Экспорт / кандидат')
    if p.startswith('design/2d/winter-wardrobe-v3/'):
        names={'zhuzha-winter-santa-front':'Жужа / рождественский колпак / анфас','zhuzha-winter-antlers-front':'Жужа / оленьи рожки / анфас','preview':'Рождественские головные уборы / первые примерки'}
        record.update(category='Наряды',season='Зима / Рождество',style='Медовый кристалл / зимний гардероб',status='На просмотре',title=names.get(stem,stem),role='Лист / сравнение' if stem=='preview' else 'Изображение')
        if '/sources/' in p:record.update(role='Исходник / сырой',status='Исходник')
        elif p.endswith('.webp'):record.update(role='Экспорт для игры',status='Экспорт / кандидат')
    if p.startswith('design/2d/winter-wardrobe-v2/'):
        names={'zhuzha-winter-outfit-front':'Жужа / зимний комплект / анфас','zhuzha-winter-outfit-q3-front':'Жужа / зимний комплект / три четверти','zhuzha-winter-outfit-side':'Жужа / зимний комплект / профиль','preview':'Зимний комплект Жужи / три ракурса с исходниками'}
        record.update(category='Наряды',season='Зима / Рождество',style='Медовый кристалл / зимний гардероб',status='На просмотре',title=names.get(stem,stem),role='Лист / сравнение' if stem=='preview' else 'Изображение')
        if '/sources/' in p:record.update(role='Исходник / сырой',status='Исходник')
        elif p.endswith('.webp'):record.update(role='Экспорт для игры',status='Экспорт / кандидат')
    if p.startswith('design/2d/winter-scarf-layer-v2/'):
        names={'scarf-front':'Зимний шарф / отдельный слой','fitting-front':'Зимний шарф / примерка','outfit-front':'Зимняя шапка и шарф / примерка','preview':'Зимний шарф / общий лист'}
        record.update(category='Наряды',season='Зима / Рождество',style='Медовый кристалл',status='На просмотре',title=names.get(stem,stem),role='Лист / сравнение' if stem=='preview' else 'Изображение')
        if '/sources/' in p or stem.startswith('scarf-fitted-'):record.update(role='Исходник / сырой',status='Исходник')
        elif p.endswith('.webp'):record.update(role='Экспорт для игры',status='Экспорт / кандидат')
    if p.startswith('design/2d/winter-scarf-layer-v1/'):
        names={'scarf-front':'Зимний шарф / отдельный слой','fitting-front':'Зимний шарф / примерка','outfit-front':'Зимняя шапка и шарф / примерка','preview':'Зимний шарф / общий лист'}
        record.update(category='Наряды',season='Зима / Рождество',style='Медовый кристалл',status='На просмотре',title=names.get(stem,stem),role='Лист / сравнение' if stem=='preview' else 'Изображение')
        if '/sources/' in p:record.update(role='Исходник / сырой',status='Исходник')
        elif p.endswith('.webp'):record.update(role='Экспорт для игры',status='Экспорт / кандидат')
    if p.startswith('design/2d/winter-hat-layer-v2/'):
        names={'hat-q3-front':'Шапка / три четверти','hat-side':'Шапка / профиль','fitting-q3-front':'Жужа в шапке / три четверти','fitting-side':'Жужа в шапке / профиль','preview':'Зимняя шапка / спрайт и примерка'}
        record.update(category='Наряды',season='Зима / Рождество',style='Медовый кристалл',status='На просмотре',title=names.get(stem,stem),role='Лист / сравнение' if stem=='preview' else 'Изображение')
        if '/sources/' in p or stem.startswith('antennae-'):record.update(role='Исходник / сырой',status='Исходник')
        elif p.endswith('.webp'):record.update(role='Экспорт для игры',status='Экспорт / кандидат')
    if p.startswith('design/2d/winter-hat-layer-v1/'):
        names={'hat-front':'Зимняя шапка / отдельный слой','fitting-front':'Зимняя шапка / примерка на Жуже','preview':'Зимняя шапка / спрайт и примерка'}
        record.update(category='Наряды',season='Зима / Рождество',style='Медовый кристалл',status='На просмотре',title=names.get(stem,stem),role='Лист / сравнение' if stem=='preview' else 'Изображение')
        if '/sources/' in p or stem=='antennae-front':record.update(role='Исходник / сырой',status='Исходник')
        elif p.endswith('.webp'):record.update(role='Экспорт для игры',status='Экспорт / кандидат')
    if p.startswith('design/2d/winter-wardrobe-v1/'):
        names={'zhuzha-winter-hat-front':'Жужа / зимняя шапка / анфас','zhuzha-winter-scarf-front':'Жужа / зимний шарф / анфас','zhuzha-winter-outfit-front':'Жужа / зимний комплект / анфас','preview':'Зимний гардероб / три примерки на Жуже'}
        record.update(category='Наряды',season='Зима / Рождество',style='Медовый кристалл / зимний гардероб',status='На просмотре',title=names.get(stem,stem),role='Лист / сравнение' if stem=='preview' else 'Изображение')
        if '/sources/' in p:record.update(role='Исходник / сырой',status='Исходник')
        elif p.endswith('.webp'):record.update(role='Экспорт для игры',status='Экспорт / кандидат')
    if p.startswith(('design/art/winter-decor-v1/','design/art/winter-decor-v2/','design/art/winter-decor-v3/')):
        names={'deco_winter_icicles':'Сосульки для улья','deco_winter_star':'Золотая звезда для улья','deco_winter_tree':'Рождественская ёлочка','deco_winter_garland':'Зимняя гирлянда','deco_winter_snowman':'Зимний снеговик','deco_winter_lantern':'Фонарики в снегу','preview':'Зимние украшения / светлый и ночной фон'}
        record.update(category='Декор',season='Зима / Рождество',style='Медовый кристалл',status='На просмотре',title=names.get(stem,stem),role='Лист / сравнение' if stem=='preview' else 'Изображение')
        if '/sources/' in p:record.update(role='Исходник / сырой',status='Исходник')
        elif p.endswith('.webp'):record.update(role='Экспорт для игры',status='Экспорт / кандидат')
    if p.startswith('design/art/winter-chests-v2/'):
        names={'chest-winter-open':'Зимний сундук / открытый концепт','chest-christmas-open':'Рождественский сундук / открытый концепт','preview':'Зимние сундуки / закрыто и открыто'}
        record.update(category='Коробки и сундуки',season='Зима / Рождество',style='Медовый кристалл',status='На просмотре',title=names.get(stem,stem),role='Лист / сравнение' if stem=='preview' else 'Изображение')
        if '/sources/' in p:record.update(role='Исходник / сырой',status='Исходник')
        elif p.endswith('.webp'):record.update(role='Экспорт для игры',status='Экспорт / кандидат')
    if p.startswith('design/art/winter-chests-v1/'):
        labels={'chest-winter-closed':'Зимний сундук / закрытый','chest-christmas-closed':'Рождественский сундук / закрытый','preview':'Сезонные сундуки / сравнение с обычными'}
        record.update(category='Коробки и сундуки',season='Зима / Рождество',style='Медовый кристалл',status='На просмотре',title=labels.get(stem,stem),role='Лист / сравнение' if stem=='preview' else 'Изображение')
        if '/sources/' in p:record.update(role='Исходник / сырой',status='Исходник')
        elif p.endswith('.webp'):record.update(role='Экспорт для игры',status='Экспорт / кандидат')
    if p.startswith('design/art/winter-glyphs-v1/'):
        winter_glyph_names={'cell0':'Солнце','cell1':'Сердце','cell2':'Цветок','cell3':'Капля','cell4':'Лист','cell_wild':'Джокер','bomb':'Компактная зимняя бомба','cell_snowflake':'Ивентовая снежинка','preview':'Все восемь зимних глифов','compare':'Исходные и зимние глифы','small-size':'Зимние глифы / 48 и 64 px','board-winter-day':'Зимние глифы / проба на дневном фоне','board-winter-evening':'Зимние глифы / проба на вечернем фоне'}
        record.update(category='Глифы и соты',season='Зима / Рождество',style='Яркие · спокойнее / зима',status='На просмотре',title=winter_glyph_names.get(stem,stem),role='Изображение' if stem in {'cell0','cell1','cell2','cell3','cell4','cell_wild','bomb','cell_snowflake'} else 'Лист / сравнение')
        if '/sources/' in p:record.update(role='Лист / источник',status='Исходник')
        elif p.endswith('.webp'):record.update(role='Экспорт для игры',status='Экспорт / кандидат')
    if p.startswith('design/art/winter-glyph-styles-v2/'):
        winter_styles={'classic':'Яркие (1.5)','pastel':'Матовая пастель','wax':'Тёплый воск','balanced':'Медовый · мягче','mellow':'Яркие · спокойнее'}
        code=p.split('/')[3];name=winter_styles.get(code,'Все стили')
        glyph={'cell0':'Солнце','cell1':'Сердце','cell2':'Цветок','cell3':'Капля','cell4':'Лист','cell_wild':'Джокер','bomb':'Компактная бомба','cell_snowflake':'Ивентовая снежинка'}
        record.update(category='Глифы и соты',season='Зима / Рождество',style=name+' / зима' if code in winter_styles else 'Сравнение стилей',status='На просмотре',title=name+' / '+glyph.get(stem,stem),role='Изображение' if stem in glyph else 'Лист / сравнение')
        if stem in {'all-styles','all-styles-night'}:record['title']='Все пять зимних стилей / '+('ночной фон' if stem.endswith('night') else 'светлый фон')
        elif stem=='preview':record['title']=name+' / зимний набор'
        elif stem=='small-size':record['title']=name+' / проверка 48 и 64 px'
        if '/sources/' in p:record.update(role='Лист / источник',status='Исходник')
        elif p.endswith('.webp'):record.update(role='Экспорт для игры',status='Экспорт / кандидат')
    if p.startswith('design/art/winter-backgrounds-v1/'):
        winter_titles={'garden_bg_winter':'Зимний сад / дневной снег','hive_bg_christmas':'Праздничный улей / хвоя и огоньки','puzzle_christmas':'Зимняя головоломка / вечерняя поляна','preview':'Зимние фоны / первая серия'}
        record.update(category='Фоны и грядки',season='Зима / Рождество',style='Медовый кристалл',status='На просмотре',title=winter_titles.get(stem,stem),role='Лист / сравнение' if stem=='preview' else 'Изображение')
        if p.endswith('.webp'):record.update(role='Экспорт для игры',status='Экспорт / кандидат')
    if p.startswith('design/art/winter-christmas-backgrounds-v2/'):
        winter_series={'winter-evening':'Зимний вечер','christmas-day':'Рождество / день','christmas-evening':'Рождество / вечер'}
        series=next((v for k,v in winter_series.items() if '/'+k+'/' in p),'Все новые серии')
        scene=next((v for k,v in [('garden_bg','Сад'),('hive_bg','Улей'),('puzzle_bg','Головоломка')] if stem.startswith(k)),'Сравнение фонов')
        record.update(category='Фоны и грядки',season='Зима' if '/winter-evening/' in p else 'Рождество / Новый год',style='Медовый кристалл',status='На просмотре',title=series+' / '+scene,role='Лист / сравнение' if stem in {'preview','compare-all'} else 'Изображение')
        if stem=='compare-all':record['title']='Зима и Рождество / все 12 фонов с первой серией'
        if p.endswith('.webp'):record.update(role='Экспорт для игры',status='Экспорт / кандидат')
    if p.startswith('design/art/winter-unified-v3/'):
        state=next((v for k,v in [('winter-day','Зима / день'),('winter-evening','Зима / вечер'),('christmas-day','Рождество / день'),('christmas-evening','Рождество / вечер')] if '/'+k+'/' in p),'Все состояния')
        scene={'garden':'Сад','hive':'Улей','puzzle':'Головоломка'}.get(stem,stem)
        version='B / единая альтернатива' if '/alternative/' in p else 'A / прежний комплект'
        sheets={'baseline-12':'A / полный комплект 12','alternative-12':'B / единая альтернатива / 12 фонов','puzzle-day-before-after':'Дневная зимняя головоломка / исправление','compare-garden':'Сад / A и B / четыре состояния','compare-hive':'Улей / A и B / четыре состояния','compare-puzzle':'Головоломка / A и B / четыре состояния'}
        record.update(category='Фоны и грядки',style='Медовый кристалл / единая альтернатива' if '/alternative/' in p else 'Медовый кристалл',season='Рождество / Новый год' if '/christmas-' in p else 'Зима' if '/winter-' in p else 'Зима / Рождество',status='На просмотре',title=sheets.get(stem,version+' / '+state+' / '+scene),role='Лист / сравнение' if stem in sheets else 'Изображение')
        if p.endswith('.webp'):record.update(role='Экспорт для игры',status='Экспорт / кандидат')
    parts=p.split('/')
    record['family']='/'.join(parts[:3])
    if p.startswith('design/art/winter-unified-v3/') and len(parts)>4:record['family']='/'.join(parts[:4])
    if p.startswith('design/art/winter-christmas-backgrounds-v2/') and len(parts)>4:record['family']='/'.join(parts[:4])
    if p.startswith('design/2d/halloween/'):
        record['family']='/'.join(parts[:4])
        if len(parts)>5 and parts[4].startswith('rework-'):record['family']='/'.join(parts[:5])
    technical_roles={'Отдельный слой','Исходник / сырой','Лист / источник','Маска / технический слой','Экспорт для игры'}
    shelf='main';reason='Основной рисунок или обзор набора'
    if record['role'] in technical_roles or any(v in p for v in ('/sources/','/sources-animation-','/source-','/runtime/')):
        shelf='technical';reason='Часть сборки, исходник или экспорт; сохранён для работы'
    elif record['role']=='Проверка в игре' or record['category']=='Макеты и проверки':
        shelf='fittings';reason='Макет или проверка, а не отдельный игровой рисунок'
    elif record['role']=='Собранный вид' or any(v in p for v in ('/all-species-accessories-v1/','/species-','/zhuzha-accessories-review/')):
        shelf='fittings';reason='Примерка наряда на персонаже'
    elif record['status'] in {'Кандидат / вариант','На просмотре'}:
        shelf='review';reason='Вариант для просмотра; утверждение не предполагается'
    if record['status']=='Требует доработки':
        shelf='repair';reason='Ранее отмечена проблема качества или посадки'
    # Explicit obsolete iterations only: never infer approval from a version number.
    old_sets=('headwear-turnaround-v1','cloth-turnaround-v1','cloth-turnaround-v2','species-headwear-fit-v1','species-cloth-fit-v1','species-face-audio-fit-v1','face-accessories-turnaround-v1','audio-halo-turnaround-v1','headwear-rework-v2','cloth-rework-v2','crown-turnaround-v1','crown-layer-fix-v3')
    old_halloween=('/costumes/rework-v5/','/costumes/rework-v3/zhuzha/vampcape','/costumes/vampcape-','/review/vampcape-','/review/zhuzha-wreath-vampire-v4','/review/zhuzha-vampire-v5','/review/zhuzha-vampire-current-v7','/review/zhuzha-vampire-v4')
    if record['status'] in {'Архив / пробы','Исключено','Только библиотека','Только библиотека / не утверждено'} or record['category']=='3D-пробы' or any('/'+v+'/' in p for v in old_sets) or any(v in p for v in old_halloween) or 'headphones' in p or '/intro-v1/' in p:
        shelf='archive';reason='Прежняя итерация, проба или вариант, оставленный только в библиотеке'
    if p.startswith('design/art/glyph-contrast-options-v1/') and stem.startswith(('01-soft','04a-halloween-soft')):
        shelf='archive';reason='Стиль оставлен только в библиотеке по выбору владельца'
    if '/buzzle-wordmark' in p:
        record.update(category='Иконки и промо',status='На выбор',season='Хеллоуин' if 'halloween' in p else 'Обычные')
        shelf='review';reason='Три варианта логотипа; финальный ещё не выбран'
        if stem=='comparison':record.update(title='Buzzle / '+('Halloween / ' if 'halloween' in p else '')+'три логотипа на двух фонах',role='Лист / сравнение')
        else:record['title']='Buzzle / '+('Halloween / ' if 'halloween' in p else '')+'логотип '+stem.rsplit('-',1)[-1]
    if '/intro-gemini-brief-v1/' in p:
        shelf='technical';reason='Пакет референсов для внешней генерации видео'
    if p.startswith('design/art/art-'):
        shelf='archive';reason='Ранние эксперименты художественного направления'
    if '/all-species-accessories-v1/' in p and (stem=='front-base-view' or record['role']=='Лист / сравнение'):
        shelf='main';reason='Обзор актуального набора пчёл и нарядов'
        if stem=='overview':record['title']='Все пчёлы / наряды и ракурсы'
        elif stem.endswith('-sheet'):record['title']=(record['species'] or stem.removesuffix('-sheet'))+' / все наряды и ракурсы'
    if p=='design/2d/bee-turnarounds/compare.png':record['title']='Все пчёлы / основные ракурсы'
    if record['category']=='Прочее':
        if stem in {'honey','jelly','can','shovel','seed','drop'}:record['category']='Ресурсы и инструменты'
        elif stem.startswith('comb'):record['category']='Глифы и соты'
        elif p.startswith('assets/'):record['category']='Иконки и промо'
        elif 'all-assets-review' in p or stem=='overview':record['category']='Макеты и проверки'
    if p.startswith('design/art/winter-decor-v7/') and shelf != 'technical':
        shelf='archive'; reason='Пользователь предпочёл исходные варианты v4'
        record['status']='Архив'
    record.update(shelf=shelf,shelfLabel=SHELVES[shelf],organizationReason=reason)
    return record

def build(target):
    target=Path(target);target.mkdir(parents=True,exist_ok=True)
    if not (target/'styles.html').exists():
        subprocess.run([sys.executable,str(REPO/'scripts/build_art_style_board.py'),'--output',str(target)],check=True)
    for name in ('files','thumbs'):(target/name).mkdir(exist_ok=True)
    cache_path=target/'.inventory-cache.json'
    try:cache=json.loads(cache_path.read_text())
    except (OSError,ValueError):cache={}
    next_cache={};groups={};source_count=0
    for path in files():
        rel=path.relative_to(REPO).as_posix();stat=path.stat();sig=[stat.st_size,stat.st_mtime_ns]
        entry=cache.get(rel)
        if not entry or entry['sig']!=sig:entry={'sig':sig,'hash':hashlib.sha256(path.read_bytes()).hexdigest()}
        next_cache[rel]=entry;source_count+=1
        groups.setdefault(entry['hash'],[]).append((path,rel,stat))
    priority=lambda x:(0 if x[1].startswith('assets/') else 1 if 'all-species-accessories' in x[1] else 3 if x[1].startswith('outputs/') else 2,len(x[1]),x[1])
    def prepare(pair):
        digest,aliases=pair;aliases.sort(key=priority);path,rel,stat=aliases[0]
        dest=target/'files'/(digest+path.suffix.lower())
        if not dest.exists():
            try:os.link(path,dest)
            except OSError:shutil.copy2(path,dest)
        thumb=target/'thumbs'/(digest+'.webp');size=None;mode=None
        try:
            with Image.open(path) as original:
                size=list(original.size);mode=original.mode
                if not thumb.exists():
                    im=ImageOps.exif_transpose(original).convert('RGBA');im.thumbnail((360,360),Image.Resampling.LANCZOS);im.save(thumb,'WEBP',quality=85,method=3)
        except Exception as exc:
            if path.suffix.lower()!='.svg':return {'error':rel+': '+str(exc)}
        record=classify(rel)
        # A current alias takes precedence over an old duplicate; keep every origin visible.
        record.update(id=digest,src='files/'+dest.name,thumb='thumbs/'+thumb.name if thumb.exists() else 'files/'+dest.name,path=rel,aliases=[a[1] for a in aliases],size=size,mode=mode,bytes=stat.st_size,modified=datetime.fromtimestamp(stat.st_mtime,timezone.utc).isoformat(),format=path.suffix.lower()[1:])
        return organize(record)
    with ThreadPoolExecutor(max_workers=4) as pool:prepared=list(pool.map(prepare,groups.items()))
    errors=[a['error'] for a in prepared if 'error' in a];records=[a for a in prepared if 'error' not in a]
    records.sort(key=lambda a:(CATEGORIES.index(a['category']),a['title'],a['path']))
    data={'updated':datetime.now(timezone.utc).isoformat(),'sourceFiles':source_count,'uniqueImages':len(records),'duplicatesGrouped':source_count-len(groups),'errors':errors,'shelves':dict(Counter(a['shelf'] for a in records)),'assets':records}
    payload=json.dumps(data,ensure_ascii=False,separators=(',',':'))
    # Atomic writes keep refreshes safe while the browser is open.
    temp=target/'catalog.json.tmp';temp.write_text(payload);temp.replace(target/'catalog.json')
    template=(REPO/'design/art/asset-library/catalog.template.html').read_text()
    rendered=template.replace('__CATALOG_DATA__',payload.replace('</','<\\/'))
    temp=target/'index.html.tmp';temp.write_text(rendered);temp.replace(target/'index.html')
    cache_path.write_text(json.dumps(next_cache,separators=(',',':')))
    (target/'collection-summary.json').write_text(json.dumps({k:v for k,v in data.items() if k!='assets'}|{'categories':dict(Counter(a['category'] for a in records))},ensure_ascii=False,indent=2))
    return data

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--output',type=Path,required=True);args=parser.parse_args()
    result=build(args.output);print(json.dumps({k:v for k,v in result.items() if k!='assets'},ensure_ascii=False))
