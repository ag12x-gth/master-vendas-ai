# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e3]:
    - link "Master IA" [ref=e5] [cursor=pointer]:
      - /url: /
      - img [ref=e6] [cursor=pointer]
      - generic [ref=e9] [cursor=pointer]: Master IA
    - generic [ref=e10]:
      - heading "Esqueceu sua senha?" [level=2] [ref=e11]
      - paragraph [ref=e12]: Sem problemas. Insira seu e-mail e enviaremos um link para redefinir sua senha.
    - generic [ref=e13]:
      - paragraph [ref=e14]: Verifique seu e-mail
      - paragraph [ref=e15]: Se a conta existir, um link de recuperação foi enviado para o endereço fornecido.
    - paragraph [ref=e16]:
      - text: Lembrou sua senha?
      - link "Fazer login" [ref=e17] [cursor=pointer]:
        - /url: /login
  - button "Toggle theme" [ref=e19] [cursor=pointer]:
    - img [ref=e20] [cursor=pointer]
    - img
    - generic [ref=e26] [cursor=pointer]: Toggle theme
  - region "Notifications (F8)":
    - list [ref=e28]:
      - listitem [ref=e29]:
        - generic [ref=e30]:
          - generic [ref=e31]: Link de Recuperação Enviado!
          - generic [ref=e32]: Se o e-mail estiver registado, um link de recuperação foi enviado.
        - button [ref=e33] [cursor=pointer]:
          - img [ref=e34] [cursor=pointer]
  - alert [ref=e38]
  - status [ref=e39]: Notification Link de Recuperação Enviado!Se o e-mail estiver registado, um link de recuperação foi enviado.
```