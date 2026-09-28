// Mirrors active sample taxonomy IDs from wireframes/index.html catalogSeed.
export const industries=[
  {
    "id": "IND-1",
    "name": "Điện nước",
    "groups": [
      {
        "id": "GRP-1",
        "name": "Dịch vụ điện nước",
        "skills": [
          {
            "id": "SKL-1-1",
            "name": "Sửa điện dân dụng"
          },
          {
            "id": "SKL-1-2",
            "name": "Sửa vòi nước / đường ống"
          }
        ]
      }
    ]
  },
  {
    "id": "IND-2",
    "name": "Điện lạnh / gia dụng",
    "groups": [
      {
        "id": "GRP-2",
        "name": "Dịch vụ điện lạnh / gia dụng",
        "skills": [
          {
            "id": "SKL-2-1",
            "name": "Vệ sinh điều hòa"
          },
          {
            "id": "SKL-2-2",
            "name": "Sửa máy giặt"
          }
        ]
      }
    ]
  },
  {
    "id": "IND-3",
    "name": "Vệ sinh",
    "groups": [
      {
        "id": "GRP-3",
        "name": "Dịch vụ vệ sinh",
        "skills": [
          {
            "id": "SKL-3-1",
            "name": "Dọn nhà"
          },
          {
            "id": "SKL-3-2",
            "name": "Vệ sinh sofa"
          }
        ]
      }
    ]
  },
  {
    "id": "IND-4",
    "name": "Điện thoại / máy tính",
    "groups": [
      {
        "id": "GRP-4",
        "name": "Dịch vụ điện thoại / máy tính",
        "skills": [
          {
            "id": "SKL-4-1",
            "name": "Sửa máy tính"
          },
          {
            "id": "SKL-4-2",
            "name": "Sửa điện thoại"
          }
        ]
      }
    ]
  },
  {
    "id": "IND-5",
    "name": "Xe máy / ô tô",
    "groups": [
      {
        "id": "GRP-5",
        "name": "Dịch vụ xe máy / ô tô",
        "skills": [
          {
            "id": "SKL-5-1",
            "name": "Sửa xe máy"
          },
          {
            "id": "SKL-5-2",
            "name": "Rửa xe"
          }
        ]
      }
    ]
  },
  {
    "id": "IND-6",
    "name": "Thú cưng",
    "groups": [
      {
        "id": "GRP-6",
        "name": "Dịch vụ thú cưng",
        "skills": [
          {
            "id": "SKL-6-1",
            "name": "Grooming"
          },
          {
            "id": "SKL-6-2",
            "name": "Trông thú cưng"
          }
        ]
      }
    ]
  },
  {
    "id": "IND-7",
    "name": "Làm đẹp không y tế",
    "groups": [
      {
        "id": "GRP-7",
        "name": "Dịch vụ làm đẹp không y tế",
        "skills": [
          {
            "id": "SKL-7-1",
            "name": "Làm nail"
          },
          {
            "id": "SKL-7-2",
            "name": "Trang điểm"
          }
        ]
      }
    ]
  },
  {
    "id": "IND-8",
    "name": "Chuyển nhà / bốc xếp",
    "groups": [
      {
        "id": "GRP-8",
        "name": "Dịch vụ chuyển nhà / bốc xếp",
        "skills": [
          {
            "id": "SKL-8-1",
            "name": "Chuyển nhà"
          },
          {
            "id": "SKL-8-2",
            "name": "Bốc xếp"
          }
        ]
      }
    ]
  },
  {
    "id": "IND-9",
    "name": "Giặt / chăm sóc đồ dùng",
    "groups": [
      {
        "id": "GRP-9",
        "name": "Dịch vụ giặt / chăm sóc đồ dùng",
        "skills": [
          {
            "id": "SKL-9-1",
            "name": "Giặt quần áo"
          },
          {
            "id": "SKL-9-2",
            "name": "Vệ sinh giày"
          }
        ]
      }
    ]
  },
  {
    "id": "IND-10",
    "name": "Thiết bị / camera / mạng",
    "groups": [
      {
        "id": "GRP-10",
        "name": "Dịch vụ thiết bị / camera / mạng",
        "skills": [
          {
            "id": "SKL-10-1",
            "name": "Lắp camera"
          },
          {
            "id": "SKL-10-2",
            "name": "Cài mạng Wi-Fi"
          }
        ]
      }
    ]
  }
];
export const skills=industries.flatMap(i=>i.groups.flatMap(g=>g.skills.map(s=>({...s,industryId:i.id,industry:i.name,group:g.name}))));
export const normalize=value=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').toLowerCase().trim();
const aliases={'Điện nước':['Sửa điện dân dụng','Sửa vòi nước / đường ống'],'Điện lạnh':['Vệ sinh điều hòa'],'Vệ sinh':['Dọn nhà'],'Chăm xe':['Rửa xe'],'Sửa điện':['Sửa điện dân dụng'],'Sửa rò nước':['Sửa vòi nước / đường ống'],'Dọn nhà định kỳ':['Dọn nhà']};
export const skillNames=p=>[...new Set((p.skills||[p.skill]).flatMap(n=>aliases[n]||[n]))];
export const matchesIndustry=(p,name)=>name==='Tất cả'||skills.some(s=>s.industry===name&&skillNames(p).includes(s.name));
