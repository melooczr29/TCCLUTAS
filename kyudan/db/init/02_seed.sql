-- Faixas padrao da plataforma (academy_id nulo). A academia pode sobrescrever.
-- Os numeros de aulas exigidas sao valores iniciais e devem ser ajustados
-- por cada academia (RF-10).
INSERT INTO belts (modality_id, name, color, sort_order, required_classes) VALUES
 ('judo','Branca','#ffffff',1,0),
 ('judo','Cinza','#9aa0a6',2,40),
 ('judo','Azul','#1f5fbf',3,50),
 ('judo','Amarela','#f2c200',4,50),
 ('judo','Laranja','#e8730c',5,60),
 ('judo','Verde','#1e8e3e',6,60),
 ('judo','Roxa','#6a2c91',7,80),
 ('judo','Marrom','#6b4226',8,100),
 ('judo','Preta','#111111',9,150),
 ('bjj','Branca','#ffffff',1,0),
 ('bjj','Azul','#1f5fbf',2,120),
 ('bjj','Roxa','#6a2c91',3,160),
 ('bjj','Marrom','#6b4226',4,160),
 ('bjj','Preta','#111111',5,200);

INSERT INTO techniques (modality_id, name, category, required_for_belt_id)
SELECT 'judo', t.name, t.category, b.id
FROM (VALUES
 ('Ukemi (rolamentos e quedas)','Fundamentos',2),
 ('O-soto-gari','Nage-waza',2),
 ('O-goshi','Nage-waza',2),
 ('Kesa-gatame','Osae-komi-waza',2),
 ('Ippon-seoi-nage','Nage-waza',3),
 ('De-ashi-barai','Nage-waza',3),
 ('Yoko-shiho-gatame','Osae-komi-waza',3)
) AS t(name, category, ord)
JOIN belts b ON b.modality_id = 'judo' AND b.sort_order = t.ord AND b.academy_id IS NULL;
