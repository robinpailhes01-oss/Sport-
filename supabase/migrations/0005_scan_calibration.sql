-- Calage du calque musculaire sur les photos de scan.
-- Le corps de chacun tombe différemment dans le cadre : plutôt que de
-- prétendre deviner, on laisse l'opérateur caler le calque une fois par
-- angle. La pose de scan étant standardisée (silhouette-guide), ce calage
-- reste valable pour tous les scans suivants.
--
-- Forme : { "face": {"x":0,"y":0,"scaleX":1,"scaleY":1}, "profil": {...}, "dos": {...} }
alter table operator_profile
  add column if not exists scan_calibration jsonb;
