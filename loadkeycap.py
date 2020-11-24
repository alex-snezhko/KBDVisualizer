import json

all_verts = []
all_normals = []
all_uvs = []
all_tris = []
with open('R1Cherry1U.obj') as f:
    row = None
    for line in f:
        line = line.strip()
        # if line[:3] == 'o R' and 'Deform' not in line:
        #     all_verts = []
        #     all_normals = []
        #     all_uvs = []
        #     all_tris = []
        #     row = int(line[3])
        # elif row is not None:
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
            split = [[int(x) for x in d.split('/')] for d in data]
            all_tris.append(split)

verts = all_verts
norms = [None for _ in all_verts]
uvs = [None for _ in all_verts]
tris = []
for tri in all_tris:
    for v in tri:
        pi, ti, ni = v
        uvs[pi - 1] = all_uvs[ti - 1]
        norms[pi - 1] = all_normals[ni - 1]

    tris.append([v[0] for v in tri])

x = json.dumps({
    'vertexes': verts,
    'normals': norms,
    'triangles': tris,
    'uvs': uvs
})
with open('r1cherry1u.json', 'w') as f:
    f.write(x)