import json

content = []
with open('keycapcolors_out.json') as f:
    for line in f:
        if len(line) != 0 and line[-1] == '\n':
            line = line[:-1]
        indent = 0
        for c in line:
            if c == ' ':
                indent += 1
            else:
                break

        i = line.find('@@ #')
        if i != -1:
            h = line[i+4:]
            h = h[:h.index('"')]
            print(h)
            r = h[:2]
            g = h[2:4]
            b = h[4:]
            if len(r) != 2 or len(g) != 2 or len(b) != 2:
                print('oop ' + line)
                exit()
            
            try:
                r = int(r, 16) / 255
                g = int(g, 16) / 255
                b = int(b, 16) / 255

                spaces = ''.join([' ' for _ in range(indent + 4)])
                less = ''.join([' ' for _ in range(indent)])

                l1 = line[:i-1] + '['
                l2 = spaces + str(r) + ','
                l3 = spaces + str(g) + ','
                l4 = spaces + str(b)
                l5 = less + ']'
                if line[-1] == ',':
                    l5 += ','
                content.append(l1)
                content.append(l2)
                content.append(l3)
                content.append(l4)
                content.append(l5)
            except:
                print('oop ' + line)
                exit()
        else:
            content.append(line)

            






with open('keycapcolors_out_new.json', 'w') as f:
    f.write('\n'.join(content))