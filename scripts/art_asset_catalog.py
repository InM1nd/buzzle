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
    return dict(title=title,category=category,role=role,style=style,season=season,status=status,species=species,accessory=accessory)

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
        return record
    with ThreadPoolExecutor(max_workers=4) as pool:prepared=list(pool.map(prepare,groups.items()))
    errors=[a['error'] for a in prepared if 'error' in a];records=[a for a in prepared if 'error' not in a]
    records.sort(key=lambda a:(CATEGORIES.index(a['category']),a['title'],a['path']))
    data={'updated':datetime.now(timezone.utc).isoformat(),'sourceFiles':source_count,'uniqueImages':len(records),'duplicatesGrouped':source_count-len(groups),'errors':errors,'assets':records}
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
