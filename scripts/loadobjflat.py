import json

all_verts = []
all_normals = []
all_uvs = []
all_tris = []
with open('resources/stabs.obj') as f:
    for line in f:
        line = line.strip()
        words = line.split(' ')
        if len(words) == 0:
            break

        data = words[1:]
        if words[0] == 'v':
            all_verts.append([float(x) for x in data])
        elif words[0] == 'vn':
            all_normals.append([float(x) for x in data])
        elif words[0] == 'vt':
            all_uvs.append([float(x) for x in data])
        elif words[0] == 'f':
            split = [[int(x) - 1 for x in d.split('//')] for d in data]
            all_tris.append(split)

# verts = all_verts
# norms = [None for _ in all_verts]
# uvs = [None for _ in all_verts]
verts = []
norms = []
uvs = []
tris = []
for i, tri in enumerate(all_tris):
    ni = tri[0][1]
    for v in tri:
        #pi, ti, _ = v
        pi = v[0]
        verts.append(all_verts[pi])
        #uvs.append(all_uvs[ti])
        norms.append(all_normals[ni])

    tris.append([i * 3 + x for x in range(3)])

x = json.dumps({
    'vertices': verts,
    'normals': norms,
    'triangles': tris,
    #'uvs': uvs
})
with open('resources/models/stabilizer.json', 'w') as f:
    f.write(x)



with open('resources/teststab.obj', 'w') as f:
    for v in verts:
        f.write('v ' + ' '.join(map(str, v)) + '\n')
    for n in norms:
        f.write('vn ' + ' '.join(map(str, n)) + '\n')
    # for uv in uvs:
    #     f.write('vt ' + ' '.join(map(str, uv)) + '\n')
    for t in tris:
        f.write('f ' + ' '.join(map(lambda x: str(x + 1), t)) + '\n')