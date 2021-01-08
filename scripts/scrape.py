import requests
import string
import json

# req = requests.get("https://matrixzj.github.io/docs/gmk-keycaps")

# content = req.text
# c = []
# c.index
# content = content[content.index("Table of contents"):]
# content = content[content.index("<ul>")+4:content.index("</ul>")]

# pages = content.split("</li>")
# pages = pages[1:]
# total = []
# # bi = 0
# # for i, p in enumerate(pages):
# #     if "Valentine 2018" in p:
# #         bi = i

# # pages = pages[bi:]
# for p in pages:
#     try:
#         ai = p.index("<a href=")
#     except:
#         break
#     a = p[ai + len("<a href=")+1:]
#     a = a[:a.index('"')]
#     kc_content = requests.get(a).text
#     kc_content = kc_content[kc_content.index('id="main-content"'):]
#     #kc_content = kc_content[:kc_content.index("</div>")]
#     h1 = kc_content[kc_content.index("/a>")+3:]
#     h1 = h1[:h1.index("</h1>")]
#     needed = string.ascii_letters + string.whitespace + string.digits
#     h1 = ''.join([c for c in h1 if c in needed]).strip()
#     print(h1)
#     try:
#         kc_content = kc_content[kc_content.index("ref link"):]
#         kc_content = kc_content[kc_content.index("href=")+len("href=")+1:]
#         if kc_content[0] != '"':
#             a = kc_content[:kc_content.index('">')]
#     except:
#         pass
    
#     print(a)

#     kc_content = kc_content[kc_content.index("<tr>")+4:]
#     kc_content = kc_content[kc_content.index("</td>")+5:]
#     td = kc_content[kc_content.index("<td>")+4:kc_content.index("</td>")]
#     try:
#         td = float(td)
#         if td < 80:
#             continue
#     except:
#         td = "***"
#     print(td)
#     kc_content = kc_content[kc_content.index('id="kits"'):]
#     kc_content = kc_content[kc_content.index("<img src=")+len("<img src=")+1:]
#     img = "https://matrixzj.github.io" + kc_content[:kc_content.index('"')]
#     print(img)

#     obj = {
#         "Name": h1,
#         "Image": img,
#         "Link": a,
#         "Base Price": td,
#         "Colors": [""],
#         "Material": "ABS",
#         "Legends": "Doubleshot"
#     }

#     total.append(obj)
#     s = json.dumps(total, indent=4)
#     with open("keycaps_out2.json", "w") as f:
#         f.write(s)

# s = json.dumps(total, indent=4)
# with open("keycaps_out2.json", "w") as f:
#     f.write(s)




total = []

for i in range(1, 10):
    req = requests.get("https://kbdfans.com/collections/keycaps?page=" + str(i))
    content = req.text

    content = content[content.index("data-collection-container"):content.index("pagination")]

    pages = content.split("<a ")[1:]
    # bi = 0
    # for i, p in enumerate(pages):
    #     if "Valentine 2018" in p:
    #         bi = i

    # pages = pages[bi:]
    for p in pages:
        a = p[p.index("href=") + len("href=")+1:]
        a = "https://kbdfans.com" + a[:a.index('"')]

        kc_content = requests.get(a).text
        kc_content = kc_content[kc_content.index("page-content"):]
        #kc_content = kc_content[:kc_content.index("</div>")]
        img = kc_content[kc_content.index("<img ")+5:]
        img = img[img.index(" src=")+len(" src=")+1:]
        img = img[:img.index("?")]

        title = kc_content[kc_content.index("<h1 "):]
        title = title[title.index(">")+1:title.index("</h1>")].strip()

        r = input("Skip:" + title+ "? ")
        if r == "y":
            continue

        price = kc_content[kc_content.index("data-product-price>")+len("data-product-price"):]
        price = float(price[price.index("$")+1:price.index("</span>")].strip())

        material = "***"
        legends = "***"
        try:
            specs = kc_content[kc_content.index("<ul"):]
            specs = specs[:specs.index("</ul>")]
            if "ABS" in specs:
                material = "ABS"
            if "PBT" in specs:
                if material == "ABS":
                    material += "**"
                else:
                    material = "PBT"

            lower = specs.lower()
            if "double" in lower and "shot" in lower:
                legends = "Doubleshot"
            if "dye" in lower and "sub" in lower:
                if legends != "***":
                    legends += "**"
                else:
                    legends = "Dye-sublimated"
        except:
            pass

        obj = {
            "Name": title,
            "Image": img,
            "Link": a,
            "Base Price": price,
            "Colors": [""],
            "Material": material,
            "Legends": legends
        }

        total.append(obj)
        s = json.dumps(total, indent=4)
        with open("keycaps_out2.json", "w") as f:
            f.write(s)

    s = json.dumps(total, indent=4)
    with open("keycaps_out2.json", "w") as f:
        f.write(s)


