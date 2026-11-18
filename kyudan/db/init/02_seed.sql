-- Registro de modalidades (secao 4.2 do PGT).
INSERT INTO modalities (id, name, federation, progression_label) VALUES
 ('judo', 'Judô', 'CBJ', 'kyu e dan'),
 ('bjj',  'Jiu-Jitsu', 'CBJJ', 'graus');

-- Sequencia de faixas (secao 4.2): judo ciclo kyu ate a preta (1o dan);
-- jiu-jitsu adulto. Os requisitos sao VALORES INICIAIS DE EXEMPLO, nao vem do
-- PGT: cada academia define os seus em Configurar faixas (RF-10).
INSERT INTO belts (modality_id, name, color, sort_order, min_classes, min_months) VALUES
 ('judo','Branca', '#ffffff',1,  0, 0),
 ('judo','Cinza',  '#9aa0a6',2, 50, 6),
 ('judo','Azul',   '#1f5fbf',3, 50, 6),
 ('judo','Amarela','#f2c200',4, 50, 6),
 ('judo','Laranja','#e8730c',5, 50, 6),
 ('judo','Verde',  '#1e8e3e',6, 50, 6),
 ('judo','Roxa',   '#6a2c91',7, 50, 12),
 ('judo','Marrom', '#6b4226',8, 50, 12),
 ('judo','Preta',  '#111111',9, 50, 12),
 ('bjj','Branca',  '#ffffff',1,  0, 0),
 ('bjj','Azul',    '#1f5fbf',2, 50, 12),
 ('bjj','Roxa',    '#6a2c91',3, 50, 12),
 ('bjj','Marrom',  '#6b4226',4, 50, 12),
 ('bjj','Preta',   '#111111',5, 50, 12);

-- Arvore de habilidades de exemplo (judo).
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
JOIN belts b ON b.modality_id = 'judo' AND b.sort_order = t.ord;

-- Arvore de habilidades de exemplo (jiu-jitsu).
INSERT INTO techniques (modality_id, name, category, required_for_belt_id)
SELECT 'bjj', t.name, t.category, b.id
FROM (VALUES
 ('Fuga de quadril','Fundamentos',2),
 ('Passagem de guarda toreando','Passagens',2),
 ('Raspagem de tesoura','Raspagens',2),
 ('Armlock da guarda','Finalizações',2)
) AS t(name, category, ord)
JOIN belts b ON b.modality_id = 'bjj' AND b.sort_order = t.ord;
