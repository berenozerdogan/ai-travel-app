# AI Travel App

AI destekli seyahat planlama mobil uygulaması.

## Proje Hakkında

Bu proje, kullanıcıların seyahat planlama sürecini kolaylaştırmak amacıyla geliştirilmiş yapay zekâ destekli bir mobil uygulamadır. Kullanıcılar şehir, ilgi alanı veya tercihleri doğrultusunda öneriler alabilir, gezilecek yerleri keşfedebilir ve rota oluşturabilir.

Uygulama, mobil istemci, backend servisi ve harici API’lerden oluşan bir mimariye sahiptir. Kullanıcıdan gelen istekler backend üzerinden işlenmekte ve yapay zekâ destekli öneriler üretilmektedir.

## Özellikler

- Yer / mekan arama  
- Yakındaki yerleri listeleme  
- Harita üzerinde görüntüleme  
- Yer detaylarını inceleme  
- Favorilere ekleme ve görüntüleme  
- Yapay zekâ destekli sohbet  
- Gezi planı oluşturma  
- Rota oluşturma  
- Etkinlikleri görüntüleme  

## Kullanılan Teknolojiler

- React Native (Expo)  
- FastAPI  
- Firebase (Authentication ve Firestore)  
- OpenAI API  
- Google Places API  

## Sistem Mimarisi

Sistem, istemci-sunucu (client-server) mimarisi üzerine kurulmuştur. Mobil uygulama, kullanıcı arayüzünü sağlarken backend servisi veri işleme ve iş mantığını yürütmektedir. Yapay zekâ tabanlı öneriler OpenAI API üzerinden sağlanmakta, mekan ve konum verileri Google Places API aracılığıyla elde edilmektedir.

## Ekran Görüntüleri


Tüm ekran görüntülerine aşağıdaki klasör üzerinden erişilebilir:

https://github.com/berenozerdogan/ai-travel-app/tree/main/screenshots

## Kurulum

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload