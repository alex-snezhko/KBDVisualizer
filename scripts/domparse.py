import requests
import xml.etree.ElementTree as ET
import json
import os
from bs4 import BeautifulSoup
import re

# COLORS = ['yellow', 'orange', 'red', 'violet', 'blue', 'green', 'grey', 'brown', 'white-and-black']

# colors_dict = {}
# for hue in COLORS:
#     html = requests.get('https://www.ralcolorchart.com/ral-classic/' + hue + '-hues').text
#     soup = BeautifulSoup(html)
#     html = soup.prettify()
#     html = ''.join([c for c in html if c.isascii()])
#     with open('colors/' + hue + '.xml', 'w') as f:
#         f.write(html)
    
#     tree = ET.parse('colors/' + hue + '.xml')
#     os.remove('colors/' + hue + '.xml')

#     root = tree.getroot()
#     colors_overview = root.find(".//div[@class='colors_overview']")
#     colors = colors_overview.findall('.//a[@href]')
#     links = ['https://www.ralcolorchart.com/' + c.attrib['href'] for c in colors]
#     text = [c.text.strip() for c in colors]

#     pages = zip(text, links)
#     for color, link in pages:
#         html = requests.get(link).text
#         soup = BeautifulSoup(html)
#         html = soup.prettify()
#         html = ''.join([c for c in html if c.isascii()])
#         with open('colors/' + hue + '-' + color + '.xml', 'w') as f:
#             f.write(html)

#         colortree = ET.parse('colors/' + hue + '-' + color + '.xml')
#         os.remove('colors/' + hue + '-' + color + '.xml')

#         ctroot = colortree.getroot()
#         color_info = ctroot.find(".//table[@class='data color_info']")
#         vals = color_info.find(".//td[@id='hex_code']").text.strip()[1:]
#         r = int(vals[:2], 16) / 255
#         g = int(vals[2:4], 16) / 255
#         b = int(vals[4:], 16) / 255
#         colors_dict[color] = [r, g, b]

#         jsonstr = json.dumps(colors_dict, indent=4)
#         with open('colors/ralcolors.json', 'w') as f:
#             f.write(jsonstr)
#         print(color + ' done!')

# jsonstr = json.dumps(colors_dict, indent=4)
# with open('ralcolors.json', 'w') as f:
#     f.write(jsonstr)






# COLORS = ['000-095', '100-190', '200-290', '300-360']

# colors_dict = {}
# for hue in COLORS:
#     html = requests.get('https://www.ralcolorchart.com/ral-design/' + hue).text
#     soup = BeautifulSoup(html)
#     html = soup.prettify()
#     html = ''.join([c for c in html if c.isascii()])
#     with open('colors/' + hue + '.xml', 'w') as f:
#         f.write(html)
    
#     tree = ET.parse('colors/' + hue + '.xml')
#     os.remove('colors/' + hue + '.xml')

#     root = tree.getroot()
#     colors_overview = root.find(".//div[@class='colors_overview']")
#     colors = colors_overview.findall('.//a[@href]')
#     links = ['https://www.ralcolorchart.com/' + c.attrib['href'] for c in colors]
#     text = [c.text.strip() for c in colors]

#     pages = zip(text, links)
#     for color, link in pages:
#         html = requests.get(link).text
#         soup = BeautifulSoup(html)
#         html = soup.prettify()
#         html = ''.join([c for c in html if c.isascii()])
#         with open('colors/' + hue + '-' + color + '.xml', 'w') as f:
#             f.write(html)

#         colortree = ET.parse('colors/' + hue + '-' + color + '.xml')
#         os.remove('colors/' + hue + '-' + color + '.xml')

#         ctroot = colortree.getroot()
#         color_info = ctroot.find(".//table[@class='data color_info']")
#         vals = color_info.find(".//td[@id='hex_code']").text.strip()[1:]
#         r = int(vals[:2], 16) / 255
#         g = int(vals[2:4], 16) / 255
#         b = int(vals[4:], 16) / 255
#         colors_dict[color] = [r, g, b]

#         jsonstr = json.dumps(colors_dict, indent=4)
#         with open('colors/ralcolors_design.json', 'w') as f:
#             f.write(jsonstr)
#         print(color + ' done!')

# jsonstr = json.dumps(colors_dict, indent=4)
# with open('ralcolors_design.json', 'w') as f:
#     f.write(jsonstr)





# colors_dict = {}

# html = requests.get('https://deskthority.net/wiki/Signature_Plastics_ABS_colours').text
# soup = BeautifulSoup(html)
# html = soup.prettify()
# html = ''.join([c for c in html if c.isascii()])
# with open('colors/sp.xml', 'w') as f:
#     f.write(html)

# tree = ET.parse('colors/sp.xml')
# os.remove('colors/sp.xml')

# root = tree.getroot()
# color_info = root.find(".//table[@class='switch-recognition-table']")
# rows = color_info.findall(".//tr")
# for row in rows:
#     vals = ''.join([c for c in row[3].text if c.isdigit() or c.isalpha()])[:6]
#     r = int(vals[:2], 16) / 255
#     g = int(vals[2:4], 16) / 255
#     b = int(vals[4:], 16) / 255
#     colors_dict['SP ABS ' + row[1].find('.//b').text.strip()] = [r, g, b]

# jsonstr = json.dumps(colors_dict, indent=4)
# with open('colors/sigplastics.json', 'w') as f:
#     f.write(jsonstr)





# colors_dict = {}

# tree = ET.parse('colors/pantone.xml')
# #os.remove('colors/pantone.xml')

# root = tree.getroot()
# color_data = root.findall(".//td[@onclick]")
# for color in color_data:
#     style = color.attrib['style'].lower()
#     col = style[style.find('background-color')+len('background-color'):]
#     col = col[col.find('rgb(') + 4:col.find(')')]
#     vals = [int(val) / 255 for val in col.split(',')]
#     r, g, b = tuple(vals)

#     name = color.find('.//div/small').text.strip()
#     name = ' '.join(name.split(' ')[:2]).strip()
#     colors_dict[name] = [r, g, b]

# jsonstr = json.dumps(colors_dict, indent=4)
# with open('colors/pantone.json', 'w') as f:
#     f.write(jsonstr)





# colors_dict = {}

# html = requests.get('https://matrixzj.github.io/docs/gmk-keycaps/ColorCodes/').text
# soup = BeautifulSoup(html)
# html = soup.prettify()
# html = ''.join([c for c in html if c.isascii()])
# with open('colors/gmk.xml', 'w') as f:
#     f.write(html)

# tree = ET.parse('colors/gmk.xml')
# #os.remove('colors/gmk.xml')

# root = tree.getroot()
# color_info = root.find(".//table/tbody")
# rows = color_info.findall(".//tr")
# for row in rows:
#     vals = ''.join([c for c in row[3].text if c.isdigit() or c.isalpha()])[:6]
#     r = int(row[1].text.strip()) / 255
#     g = int(row[2].text.strip()) / 255
#     b = int(row[3].text.strip()) / 255
#     colors_dict[row[0].text.strip()] = [r, g, b]

# jsonstr = json.dumps(colors_dict, indent=4)
# with open('colors/gmk.json', 'w') as f:
#     f.write(jsonstr)
keycaps = []
with open('resources/items/keycaps.json') as f:
    keycaps = [x['Name'] for x in json.loads(f.read())]

colors = {}
with open('colors/allcolors.json') as f:
    colors = json.loads(f.read())

kc_data = {}
html = requests.get("https://matrixzj.github.io/docs/gmk-keycaps").text
soup = BeautifulSoup(html)
html = soup.prettify()
html = ''.join([c for c in html if c.isascii()])
html = html.replace('xlink:href', 'href')
with open('colors/temp.xml', 'w') as f:
    f.write(html)

tree = ET.parse('colors/temp.xml')
root = tree.getroot()
os.remove('colors/temp.xml')



main = root.find(".//div[@id='main-content']")
links = main.findall(".//li/a")[1:]
for link in links:
    href = link.attrib['href']
    html = requests.get(href).text
    soup = BeautifulSoup(html)
    html = soup.prettify()
    html = ''.join([c for c in html if c.isascii()])
    html = html.replace('xlink:href', 'href')
    with open('colors/temp2.xml', 'w') as f:
        f.write(html)

    tree = ET.parse('colors/temp2.xml')
    os.remove('colors/temp2.xml')
    root = tree.getroot()

    name = root.find(".//div[@id='main-content']/h1/a").tail
    name = ''.join([c for c in name if c.isascii()]).strip()
    name = re.sub(' +', ' ', name)
    for n in [1,2,3]:
        rn = 'R' + str(n)
        name = re.sub(rn + ' ' + rn, rn, name)

    name = 'GMK ' + name
    if name not in keycaps:
        name = '**' + name
    

    info = root.findall(".//table")
    def predicate(table):
        headers = table.findall(".//thead/tr/th")
        return len(headers) == 3 and len([h for h in headers if "price" in h.text.lower()]) == 0
    tables = [t for t in info if predicate(t)]
    if len(tables) != 1:
        kc_data[name] = '***'
        continue
    table = tables[0]
    header = table.findall('.//thead/tr/th')
    if header[1].text.strip().lower() != 'base color' or header[2].text.strip().lower() != 'legend color':
        kc_data[name] = '***'
        continue

    rows = table.findall('.//tbody/tr')
    alphasKc = '**'
    alphasLegends = '**'
    modsKc = '**'
    modsLegends = '**'
    others = {}

    def to_color(c):
        lower = c.lower()
        if 'pantone' in lower:
            num = lower[lower.find('pantone')+len('pantone'):]
            ni = -1
            for i in range(len(num)):
                if num[i].isdigit():
                    ni = i

            if ni != -1:
                num = num[:ni+1]
            num = num.strip()
            num = re.sub(' +', ' ', num)
            c = 'Pantone ' + num
        elif 'c' == lower[-1]:
            nospace = ''.join(c.split(' '))
            num = nospace[:-1]
            try:
                num = float(num)
                c = 'Pantone ' + str(num)
            except:
                pass
        elif 'ral' in lower:
            nums = lower[lower.find('ral')+len('ral'):]
            nums = ''.join([c for c in nums if c.isdigit() or c == ' ']).strip()
            nums = re.sub(' +', ' ', nums)
            c = 'RAL ' + nums

        return colors.get(c, '@@ ' + c)

    for row in rows:
        head = row[0].text.strip()
        kc = row[1].text.strip()
        legends = row[2].text.strip()
        kc = to_color(kc)
        legends = to_color(legends)
        if head == 'Alpha':
            alphasKc = kc
            alphasLegends = legends
        elif head == 'Modifiers':
            modsKc = kc
            modsLegends = legends
        else:
            others['?? ' + head] = [kc, legends]

    kc_data[name] = {
        'font': 'standard',
        'alphas': {
            'keycapColor': alphasKc,
            'legendColor': alphasLegends
        },
        'mods': {
            'keycapColor': modsKc,
            'legendColor': modsLegends
        },
        'exceptions': '',
        **others
    }

    with open('keycapcolors_out.json', 'w') as f:
        f.write(json.dumps(kc_data, indent=4))

    print(name + ' done!')

    
    



