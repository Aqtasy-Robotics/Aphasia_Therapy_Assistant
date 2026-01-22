IN GOOGLE COLAB

Use this code in Google colab since it has a ffmeg file already in it

ffmeg file is a framework which is used to convert mp3 to wav format,crop, edit and trim and audio file

Before running the code change the RUNTIME to TPU since i have put whisper medium size model it would take a long time to run in normal cpu .

Whisper has tiny , small, medium, Large LLM models which increase in size portional with accuracy in output.



IN PC

To run in your local PC you must have a ffmeg in your local PC to help in editing audio file.

I have added a cpu version ffmeg file zip to the folder u can use, other ffmeg file are better than cpu version you can download according to GPU models in the web, if you have a GPU in your PC to that specific model .

Step to set up FFMEG path 

Step 1 : 

      Go to:
👉 https://www.gyan.dev/ffmpeg/builds/

Download:
     ffmpeg-release-essentials.zip

     This is Windows x64 compatible

Step 2 : 

    Extract & place FFmpeg

    Extract the ZIP

    Move the extracted folder to:

    C:\ffmpeg


    You should now have:

    C:\ffmpeg\ffmpeg-7.x.x-full_build\bin\ffmpeg.exe


    (or essentials_build — both are fine)

Step 4 :

    Add FFmpeg to PATH (IMPORTANT)

    Add THIS folder to PATH:

    C:\ffmpeg\ffmpeg-7.x.x-full_build\bin


   (add the bin folder, not the parent)

   HOW TO ADD PATH 

   Press Win + R → type:

    sysdm.cpl


    Go to:

    Advanced → Environment Variables


    Under System variables, find Path

    Click Edit → New

    Paste the FFmpeg bin path

    Click OK → OK

   Then:

   Click OK

   Restart Command Prompt / VS Code


Step 5: Verify FFmpeg works

   Open Command Prompt:

   ffmpeg -version


   You should now see version details
   If not → PATH step missed



