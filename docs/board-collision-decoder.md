# Cooked Chaos collision decoder

Проверен 2026-10-21 на выгрузке VALORANT `13.08.00.5715960`, manifest `7A64CDDDEC7CDB4C`. Это извлечение исходной collision-геометрии. Оно не подтверждает работу GroundVolumeBuilderV2 и не является проверкой готовой области Viper’s Pit.

## Подтверждённый результат

`outputs/board-data-research/collision-decoder/census.json` содержит все **14 569 cooked blobs** из terrain-выгрузки: **14 569 прочитаны, 0 ошибок**. В них 10 523 TriangleMesh, 4 873 cooked convex entries, 8 356 812 collision-треугольников. 4 016 тел содержат только convex; 264 — convex и TriangleMesh. У 30 тел нет cooked mesh: их простые формы остаются в исходном `AggGeom` и этим CLI не заменяются.

Координаты и индексы берутся исключительно из `UBodySetup.CookedFormatData`. Render LOD используется только как независимая сверка. Для Engine Plane/Cube, SuperGrid_Box, Slope_For_Volumes и WoodBox_0 совпадает точное множество координат float32 всех треугольников. У WoodBox collision содержит 224 вершины и 410 треугольников, render LOD — 452 вершины и 410 треугольников. Во всех пяти случаях cooked winding противоположен render winding; экспорт сохраняет именно cooked порядок.

Во всём наборе проверены конечность координат, границы индексов и сохранённый AABB. Он сравнивается с вершинами, **используемыми collision-треугольниками**. 29 тел содержат неиспользуемые particles, которые лежат за этим AABB; это корректные данные, а не повод расширять столкновение. Максимальное расхождение сохранённой и вычисленной границы — 0.0001083 Unreal units. Единицы исходной геометрии — сантиметры.

`test_decoder.py` проверяет реальные независимые образцы, unused particles, native invalid-index sentinel для uint8/int16, точное бинарное восстановление, изменения hash, повреждённые индексы/границы/флаги, обрыв данных, неизвестный тип, непроверенный 32-bit формат и несколько TriangleMesh objects. Все 14 проверок прошли.

## Воспроизведение

Из корня проекта, Python 3.10+ без сторонних зависимостей:

```powershell
python outputs/board-data-research/collision-decoder/test_decoder.py
python outputs/board-data-research/collision-decoder/census.py
python outputs/board-data-research/collision-decoder/export.py
python outputs/board-data-research/collision-decoder/export.py --verify --verify-source
python outputs/board-data-research/collision-decoder/validate.py
```

`export.py` по умолчанию читает `outputs/board-data-research/terrain`, пишет в `outputs/board-data-research/collision-decoder/decoded`. `--source` и `--output` позволяют выбрать явные каталоги. `--limit N` предназначен для пробного запуска и никогда не выставляет полноту набора. Пустой вход, неизвестный тип, изменение сборки/manifest/hash или непроверенная граница следующего объекта дают ошибку; записи failures остаются в `index.json`, код завершения — 1. Успешные записи не подменяются render-геометрией.

`validate.py` повторяет regression checks, сверяет полный перечень входных blobs с индексом, перечитывает бинарный экспорт и оригинальные источники, затем сохраняет `validation-report.json` и текстовые журналы. Неизменность кода декодера/CLI после генерации индекса также проверяется по hash.

Финальная повторная проверка завершилась успешно: все 14 569 записей и 10 516 geometry files перечитаны вместе с исходными cooked/JSON файлами, ошибок нет. В отчёте также зафиксированы 58 convex entries с unpaired half edges и максимальное расхождение face vertex/plane 0.958512 uu; исходные данные сохранены, свойства hulls не исправляются выдуманной геометрией.

## Формат и provenance

`decoded/index.json` связывает каждое тело с исходным package, export index/name, cooked SHA-256 и SHA-256 JSON выгрузки. Также записаны build/manifest, hash кода декодера/CLI, hash геометрического бинарного файла и hash его JSON metadata. Одинаковые cooked blobs дедуплицируются по исходному SHA-256.

Полный экспорт содержит **10 516 уникальных geometry files**, **159 573 300 bytes** бинарной геометрии и **0 rejected blobs**. В индекс включены все 14 569 исходных тел; общий vertex pool TriangleMesh содержит 4 931 389 вершин, включая 2 357 неиспользуемых particles.

`decoded/geometry/<cooked-sha>.bin` начинается с восьми ASCII-байтов `VCOL0001`, затем uint32 числа элементов. Следуют массивы float32x3 позиций и uint32x3 индексов; little endian, stride 12. Точные offsets/counts каждого массива находятся в соседнем JSON. Индексы исходного TriangleMesh сохраняются без изменения порядка. JSON дополнительно хранит AABB, исходные offsets, convex planes, margin, faces и полный half-edge structure. `--verify` перечитывает бинарные файлы и metadata, проверяет hash, все offsets, индексы и AABB; `--verify-source` дополнительно перечитывает оригинальные cooked/JSON источники.

Подтверждённый layout текущей сборки: int32 header `4`, массив Chaos pointers на FConvex, затем массив pointers на TriangleMesh. Pointer: bool32 exists, int32 tag, далее byte type и тело только при новом tag. Базовая часть implicit: bool32 isConvex, bool32 doCollide, byte collisionType. TriangleMesh: bool32 serialize particles, TArray<float3>, bool32 largeIndices=false, TArray<uint16x3>, AABB(float3 min/max). Идущий за AABB штатный acceleration-tree/metadata хвост не используется и не интерпретируется.

В полном наборе встречены только convex(type 8) и TriangleMesh(type 11), максимум один TriangleMesh на тело. HeightField, scaled/instanced implicit wrappers и несколько TriangleMesh objects не встретились. Такие входы отклоняются; нельзя перескакивать opaque хвост поиском похожей сигнатуры. В текущем наборе нет 32-bit TriangleMesh indices; этот непроверенный формат также отклоняется до подтверждения реальным VALORANT asset.

## Ограничения интеграции

- `collisionGeometryDecodeComplete` относится только к cooked mesh payload предоставленных blobs. `completeSceneCollision`, `runtimeShapeBindingsVerified` и `completeArchiveDecode` намеренно остаются false. Нужны отдельная привязка тел к активным компонентам/подуровням, наследуемые transforms, простые AggGeom-примитивы, CollisionTraceFlag и актуальные query profiles.
- Штатный BVH и последующие таблицы не восстановлены. Для одного TriangleMesh его вершины/индексы уже полностью доступны; собственный ускоритель можно строить по ним. При нескольких TriangleMesh чтение завершается ошибкой, поскольку граница следующего объекта не доказана.
- У некоторых cooked convex есть unpaired half-edge sentinel (uint8 255 либо int16 -32768). Он сохраняется отдельно; остальные twin links проверяются на взаимность. Подтверждены index types uint8/int16; другие типы отклоняются. У некоторых hulls точки и planes расходятся. Triangle fans convex faces — производное представление, **не авторитетная замена native convex query**; planes/support vertices и margin экспортированы независимо.
- Поля implicit `doCollide` не равнозначны scene query settings. У обычных TriangleMesh в текущей выгрузке это поле часто false; автоматически выкидывать их из scene нельзя. `doubleSidedGeometry`/`traceFlag` в индексе содержат только явно записанные свойства, отсутствие не превращается в выдуманное значение по умолчанию.
- Проверка cooked геометрии не доказывает равенство области газового эффекта актуальному серверному выполнению. Для этого всё ещё нужны native V2 алгоритм и воспроизводимая проверка результата в игре.

## Первичные источники

CUE4Parse source закреплён на commit `6f7b06eefa22f3cc259d03bb9901a384cb4fb538`: [FImplicitObject](https://github.com/FabianFG/CUE4Parse/blob/6f7b06eefa22f3cc259d03bb9901a384cb4fb538/CUE4Parse/UE4/Objects/Chaos/FImplicitObject.cs), [FChaosArchive](https://github.com/FabianFG/CUE4Parse/blob/6f7b06eefa22f3cc259d03bb9901a384cb4fb538/CUE4Parse/UE4/Objects/Chaos/FChaosArchive.cs), [FParticles](https://github.com/FabianFG/CUE4Parse/blob/6f7b06eefa22f3cc259d03bb9901a384cb4fb538/CUE4Parse/UE4/Objects/Chaos/Particles.cs), [FConvex](https://github.com/FabianFG/CUE4Parse/blob/6f7b06eefa22f3cc259d03bb9901a384cb4fb538/CUE4Parse/UE4/Objects/Chaos/FConvex.cs). CUE factory TriangleMesh пока не реализует; его payload здесь подтверждён самими текущими cooked данными и независимыми проверками, не заявляется взятым из CUE.

Epic документирует раздельное хранение [AggGeom, CookedFormatData, query properties и ChaosTriMeshes](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/Engine/UBodySetup), а также [half-edge structure и InvalidIndex](https://dev.epicgames.com/documentation/unreal-engine/API/Runtime/Chaos/TConvexHalfEdgeStructureData). Эти текущие API-страницы помогают трактовать сущности, но сами по себе не подтверждают бинарный формат конкретной версии игры.
