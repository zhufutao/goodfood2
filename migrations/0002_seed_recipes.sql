INSERT OR IGNORE INTO recipes (
  id, category_id, name, summary, region, difficulty, cook_time, servings, ingredients, steps, tips, cover_image_url, status
) VALUES
  (
    'recipe-scallion-pancake',
    'cat_noodles',
    '葱油饼',
    '外层酥香，内里柔韧，葱香和热油香气很适合早餐或夜宵。',
    '江南',
    '简单',
    '35 分钟',
    '2-3 人',
    '中筋面粉 300g
温水 180ml
小葱 4 根
盐 3g
食用油 适量',
    '1. 面粉加温水揉成柔软面团，醒 20 分钟。
2. 小葱切碎，和盐、热油拌成葱油馅。
3. 面团擀薄，抹葱油后卷起盘成圆饼。
4. 轻轻擀开，小火煎到两面金黄酥脆。',
    '醒面时间不要省，饼会更柔软。煎的时候火不要太大，避免外焦内生。',
    'https://placehold.co/1200x900/FDEBD4/385225?text=%E8%91%B1%E6%B2%B9%E9%A5%BC',
    'published'
  ),
  (
    'recipe-sugar-rice-cake',
    'cat_sweet',
    '红糖糍粑',
    '软糯拉丝，裹上红糖浆和黄豆粉，甜而不腻。',
    '川渝',
    '简单',
    '25 分钟',
    '2 人',
    '糯米粉 200g
温水 150ml
红糖 50g
清水 60ml
熟黄豆粉 适量',
    '1. 糯米粉加温水揉成团，分成小条。
2. 平底锅刷油，小火煎到表面微黄。
3. 红糖加清水熬成糖浆。
4. 糍粑裹糖浆后撒熟黄豆粉。',
    '糯米制品趁热吃口感最好，冷后可以回锅小火加热。',
    'https://placehold.co/1200x900/FDEBD4/385225?text=%E7%BA%A2%E7%B3%96%E7%B3%8D%E7%B2%91',
    'published'
  ),
  (
    'recipe-grilled-tofu',
    'cat_grill',
    '铁板豆腐',
    '豆腐煎到边缘微焦，刷上咸香酱汁，撒葱花辣椒粉。',
    '夜市',
    '简单',
    '20 分钟',
    '2 人',
    '老豆腐 1 块
蒜末 1 勺
生抽 2 勺
蚝油 1 勺
孜然粉 适量
辣椒粉 适量
小葱 适量',
    '1. 老豆腐切厚片，吸干表面水分。
2. 生抽、蚝油、蒜末和少量清水调成酱汁。
3. 平底锅刷油，豆腐煎至两面金黄。
4. 刷酱汁，撒孜然粉、辣椒粉和葱花。',
    '豆腐下锅前吸干水分，煎的时候更容易定型。',
    'https://placehold.co/1200x900/FDEBD4/385225?text=%E9%93%81%E6%9D%BF%E8%B1%86%E8%85%90',
    'published'
  );

INSERT OR IGNORE INTO recipe_images (id, recipe_id, url, alt, sort_order) VALUES
  ('img-scallion-1', 'recipe-scallion-pancake', 'https://placehold.co/1200x900/FDEBD4/385225?text=%E8%91%B1%E6%B2%B9%E9%A5%BC%20%E6%88%90%E5%93%81', '葱油饼成品', 0),
  ('img-scallion-2', 'recipe-scallion-pancake', 'https://placehold.co/1200x900/FDEBD4/385225?text=%E8%91%B1%E6%B2%B9%E9%A5%BC%20%E9%A4%90%E6%A1%8C', '葱油饼餐桌图', 1),
  ('img-scallion-3', 'recipe-scallion-pancake', 'https://placehold.co/1200x900/FDEBD4/385225?text=%E8%91%B1%E6%B2%B9%E9%A5%BC%20%E7%BB%86%E8%8A%82', '葱油饼细节图', 2),
  ('img-ricecake-1', 'recipe-sugar-rice-cake', 'https://placehold.co/1200x900/FDEBD4/385225?text=%E7%BA%A2%E7%B3%96%E7%B3%8D%E7%B2%91%20%E6%88%90%E5%93%81', '红糖糍粑成品', 0),
  ('img-ricecake-2', 'recipe-sugar-rice-cake', 'https://placehold.co/1200x900/FDEBD4/385225?text=%E7%BA%A2%E7%B3%96%E7%B3%8D%E7%B2%91%20%E9%A4%90%E6%A1%8C', '红糖糍粑餐桌图', 1),
  ('img-ricecake-3', 'recipe-sugar-rice-cake', 'https://placehold.co/1200x900/FDEBD4/385225?text=%E7%BA%A2%E7%B3%96%E7%B3%8D%E7%B2%91%20%E7%BB%86%E8%8A%82', '红糖糍粑细节图', 2),
  ('img-tofu-1', 'recipe-grilled-tofu', 'https://placehold.co/1200x900/FDEBD4/385225?text=%E9%93%81%E6%9D%BF%E8%B1%86%E8%85%90%20%E6%88%90%E5%93%81', '铁板豆腐成品', 0),
  ('img-tofu-2', 'recipe-grilled-tofu', 'https://placehold.co/1200x900/FDEBD4/385225?text=%E9%93%81%E6%9D%BF%E8%B1%86%E8%85%90%20%E9%A4%90%E6%A1%8C', '铁板豆腐餐桌图', 1),
  ('img-tofu-3', 'recipe-grilled-tofu', 'https://placehold.co/1200x900/FDEBD4/385225?text=%E9%93%81%E6%9D%BF%E8%B1%86%E8%85%90%20%E7%BB%86%E8%8A%82', '铁板豆腐细节图', 2);
