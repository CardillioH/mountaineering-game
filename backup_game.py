import os
import shutil
from datetime import datetime

# Создаем резервную копию игры
source_dir = r"D:\Рабочий стол\Учеба ИИ\Бога проект\game"
backup_base = r"D:\Рабочий стол\Учеба ИИ\Бога проект\backup"

# Создаем папку backup если её нет
os.makedirs(backup_base, exist_ok=True)

# Генерируем имя для резервной копии с датой и временем
timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
backup_dir = os.path.join(backup_base, f"game_{timestamp}")

# Копируем всю папку game
print(f"Создание резервной копии: {backup_dir}")
shutil.copytree(source_dir, backup_dir)
print(f"Резервная копия создана успешно!")
print(f"Файлы сохранены в: {backup_dir}")
