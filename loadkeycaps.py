import json
import string
from functools import reduce

all_verts = []
all_normals = []
all_uvs = []
all_tris = []
vert_index_offset = 0
uv_index_offset = 0
normal_index_offset = 0
with open('resources/capstogethercopy.obj') as f:
    row = None
    for line in f:
        if line[0:2] == 'o ':
            if row is not None:
                verts = all_verts
                norms = [None for _ in all_verts]
                uvs = [None for _ in all_verts]
                #untextured_tris = []
                #textured_tris = []
                tris = []

                # c = reduce(lambda l, e: l + [x[0] for x in e], all_tris, [])
                # m = max(c)
                # mi = min(c)
                for tri in all_tris:
                    for v in tri:
                        pi, ti, ni = v
                        pisub = pi - vert_index_offset
                        tisub = ti - uv_index_offset
                        nisub = ni - normal_index_offset
                        if pisub < 0 or tisub < 0 or nisub < 0:
                            print("oop")
                            exit()
                        uvs[pisub] = all_uvs[tisub]
                        norms[pisub] = all_normals[nisub]

                    # add_to = untextured_tris if all(all_uvs[v[1] - uv_index_offset] == [0, 0] for v in tri) else textured_tris
                    tris.append([v[0] - vert_index_offset for v in tri])

                x = json.dumps({
                    'vertices': verts,
                    'normals': norms,
                    'triangles': tris,
                    #'texturedTriangles': textured_tris,
                    'uvs': uvs
                })

                if row in string.digits:
                    with open(f'resources/cherry_R{row}_{units}U.json', 'w') as f:
                        f.write(x)
                else:
                    with open(f'resources/cherry_{row}.json', 'w') as f:
                        f.write(x)

                with open(f'resources/cherry_{row}_{units}U_test.obj', 'w') as f:
                    for v in verts:
                        f.write('v ' + ' '.join(map(str, v)) + '\n')
                    for n in norms:
                        f.write('vn ' + ' '.join(map(str, n)) + '\n')
                    for uv in uvs:
                        f.write('vt ' + ' '.join(map(str, uv)) + '\n')
                    for t in tris:
                        f.write('f ' + ' '.join(map(lambda x: str(x + 1), t)) + '\n')
                    # for t in textured_tris:
                    #     f.write('f ' + ' '.join(map(lambda x: str(x + 1), t)) + '\n')

                vert_index_offset += len(all_verts)
                uv_index_offset += len(all_uvs)
                normal_index_offset += len(all_normals)
                all_verts = []
                all_uvs = []
                all_normals = []
                all_tris = []
            
            if line[2] == 'R':
                row = line[3]
                units = line[5:line.index('U')]
            else:
                row = line[2:line.index('_Plane')]

            

        else:
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
                split = [[int(x) - 1 for x in d.split('/')] for d in data]
                all_tris.append(split)

            

# with open('resources/capstogether.obj') as f:
#     for line in f:
#         if line[:3] == 'o R':
#             row = line[3]
#             units = line[5:line.index('U')]

#             verts = all_verts
#             norms = [None for _ in all_verts]
#             uvs = [None for _ in all_verts]
#             tris = []
#             for tri in all_tris:
#                 for v in tri:
#                     pi, ti, ni = v
#                     uvs[pi] = all_uvs[ti]
#                     norms[pi] = all_normals[ni]

#                 tris.append([v[0] for v in tri])

#             x = json.dumps({
#                 'vertices': verts,
#                 'normals': norms,
#                 'triangles': tris,
#                 'uvs': uvs
#             })
#             with open('resources/r1cherry1u.json', 'w') as f:
#                 f.write(x)



# with open('resources/test.obj', 'w') as f:
#     for v in verts:
#         f.write('v ' + ' '.join(map(str, v)) + '\n')
#     for n in norms:
#         f.write('vn ' + ' '.join(map(str, n)) + '\n')
#     for uv in uvs:
#         f.write('vt ' + ' '.join(map(str, uv)) + '\n')
#     for t in tris:
#         f.write('f ' + ' '.join(map(lambda x: str(x + 1), t)) + '\n')