import json
import time
from deep_translator import GoogleTranslator

INPUT_FILE = '../data/places.json'  # Bir üst klasöre çıkıp data klasörüne girer
OUTPUT_FILE = '../data/places_translated.json'

def translate_data():
    # Dosyayı oku
    with open(INPUT_FILE, 'r', encoding='utf-8') as f:
        data = json.load(f)

    translator = GoogleTranslator(source='en', target='tr')
    
    # Kalanı bulmak için basit bir mantık (eğer yarım kaldıysa)
    start_index = 0
    # Eğer daha önce kısmen çevirdiysen ve places_translated.json varsa oradan devam edebiliriz
    
    print(f"Toplam {len(data)} kayıt çevrilecek. İşlem başlatıldı...")

    for index in range(start_index, len(data)):
        item = data[index]
        name_en = item.get("name", "")
        desc_en = item.get("description", "")
        
        print(f"[{index+1}/{len(data)}] Çevriliyor: {name_en}")
        
        try:
            # Çevirileri yap
            item["name"] = {
                "en": name_en,
                "tr": GoogleTranslator(source='en', target='tr').translate(name_en),
                "de": GoogleTranslator(source='en', target='de').translate(name_en),
                "ru": GoogleTranslator(source='en', target='ru').translate(name_en)
            }
            item["description"] = {
                "en": desc_en,
                "tr": GoogleTranslator(source='en', target='tr').translate(desc_en),
                "de": GoogleTranslator(source='en', target='de').translate(desc_en),
                "ru": GoogleTranslator(source='en', target='ru').translate(desc_en)
            }
            
            # Her 50 kayıtta bir kaydet (güvenlik önlemi)
            if (index + 1) % 50 == 0:
                with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
                    json.dump(data, f, ensure_ascii=False, indent=2)
                print(">>> 50 kayıt başarıyla dosyaya kaydedildi.")
                time.sleep(5) # Google'ın engellememesi için mola

        except Exception as e:
            print(f"Hata oluştu, 10 saniye bekleniyor... Hata: {e}")
            time.sleep(10)

    # Final kaydı
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print("İşlem tamamlandı! places_translated.json hazır.")

if __name__ == "__main__":
    translate_data()