
import {
  test,
  expect,
  type Page,
  type APIRequestContext,
  type Browser,
  type BrowserContext,
} from '@playwright/test';

const API_URL = 'http://127.0.0.1:8000';
const FRONTEND_URL = 'http://127.0.0.1:5173';

type Credentials = {
  email: string;
  password: string;
};

type LoginResult = {
  access_token: string;
};

function getCredentials(role: 'AGENT' | 'SUPERVISOR'): Credentials {
  const email = process.env[`E2E_${role}_EMAIL`];
  const password = process.env[`E2E_${role}_PASSWORD`];

  if (!email || !password) {
    throw new Error(
      `Faltan las variables E2E_${role}_EMAIL o E2E_${role}_PASSWORD.`,
    );
  }

  return { email, password };
}

async function apiLogin(
  request: APIRequestContext,
  credentials: Credentials,
): Promise<string> {
  const response = await request.post(`${API_URL}/api/auth/login`, {
    data: credentials,
  });

  expect(
    response.status(),
    'El inicio de sesión mediante API debe responder 200.',
  ).toBe(200);

  const result = (await response.json()) as LoginResult;

  expect(result.access_token).toBeTruthy();

  return result.access_token;
}

async function loginUI(
  page: Page,
  credentials: Credentials,
  expectedRole: 'agent' | 'supervisor',
): Promise<void> {
  await page.goto('/soporte/acceso');

  await expect(page.locator('#email')).toBeVisible();
  await page.locator('#email').fill(credentials.email);
  await page.locator('#password').fill(credentials.password);

  await page
    .getByRole('button', { name: 'Entrar a la consola' })
    .click();

  await expect(page).toHaveURL(/\/soporte\/tickets$/);

  // Verificar que el frontend guardó el JWT.
  const token = await page.evaluate(() =>
    sessionStorage.getItem('tsupp.support.jwt'),
  );

  expect(
    token,
    'El frontend debe guardar el token JWT después del login.',
  ).toBeTruthy();

  // Verificar el rol real de la sesión.
  const profileResponse = await page.request.get(
    `${API_URL}/api/auth/me`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  expect(profileResponse.status()).toBe(200);

  const profile = await profileResponse.json();

  expect(profile.role).toBe(expectedRole);
}

async function deleteArticle(
  request: APIRequestContext,
  articleId: string,
  supervisorToken: string,
): Promise<void> {
  const response = await request.delete(
    `${API_URL}/api/knowledge/${articleId}`,
    {
      headers: {
        Authorization: `Bearer ${supervisorToken}`,
      },
    },
  );

  expect([204, 404]).toContain(response.status());
}

test.describe('Gestión de conocimiento', () => {
  test('debe completar el ciclo documental y respetar los permisos', async ({
    page,
    request,
    browser,
    playwright,
  }) => {
    test.setTimeout(90_000);

    const agentCredentials = getCredentials('AGENT');
    const supervisorCredentials = getCredentials('SUPERVISOR');

    const agentToken = await apiLogin(request, agentCredentials);
    const supervisorToken = await apiLogin(request, supervisorCredentials);

    const title = `QA E2E ${Date.now()}`;

    const contentV1 = JSON.stringify({
      format: 'tsupp-knowledge-v1',
      summary: 'Resumen inicial creado para una prueba automatizada.',
      requirements: ['Acceso a la red de pruebas'],
      steps: ['Verificar la conexión inicial'],
      command: 'ping 127.0.0.1',
    });

    const contentV2 = JSON.stringify({
      format: 'tsupp-knowledge-v1',
      summary: 'Resumen actualizado para la segunda versión.',
      requirements: [
        'Acceso a la red',
        'Equipo de pruebas',
      ],
      steps: [
        'Verificar la conexión inicial',
        'Comprobar la conectividad con el servidor',
      ],
      command: 'ping 127.0.0.1',
    });

    let articleId: string | undefined;

    // Contexto independiente para la limpieza.
    const cleanupRequest = await playwright.request.newContext();

    let supervisorContext: BrowserContext | undefined;

    try {
      // --------------------------------------------------
      // 1. Crear artículo mediante API como agente.
      // --------------------------------------------------

      const createResponse = await request.post(
        `${API_URL}/api/knowledge`,
        {
          headers: {
            Authorization: `Bearer ${agentToken}`,
          },
          data: {
            title,
            category: 'Redes y Conectividad',
            content: contentV1,
            note: 'Creación automática para QA',
          },
        },
      );

      expect(createResponse.status()).toBe(201);

      const created = await createResponse.json();

      articleId = created.id;

      expect(articleId).toBeTruthy();

      // --------------------------------------------------
      // 2. Actualizar artículo y generar segunda versión.
      // --------------------------------------------------

      const updateResponse = await request.put(
        `${API_URL}/api/knowledge/${articleId}`,
        {
          headers: {
            Authorization: `Bearer ${agentToken}`,
          },
          data: {
            content: contentV2,
            note: 'Segunda versión de prueba',
          },
        },
      );

      expect(updateResponse.status()).toBe(200);

      // --------------------------------------------------
      // 3. Iniciar sesión como agente en la interfaz.
      // --------------------------------------------------

      await loginUI(
        page,
        agentCredentials,
        'agent',
      );

      await page.goto('/soporte/conocimiento');

console.log('URL después de navegar:', page.url());

console.log(
  'Token después de navegar:',
  await page.evaluate(() =>
    sessionStorage.getItem('tsupp.support.jwt')
      ? 'PRESENTE'
      : 'AUSENTE',
  ),
);

console.log(
  'Título de la página:',
  await page.title(),
);

console.log(
  'Contenido visible:',
  (await page.locator('body').innerText()).slice(0, 2000),
);

const search = page.getByRole('textbox', {
  name: 'Buscar conocimiento',
});

      await expect(
        search,
        'El agente debe acceder al buscador de conocimiento.',
      ).toBeVisible({ timeout: 15_000 });

      await search.fill(title);

      const articleCard = page
        .locator('.kb-result-card')
        .filter({ hasText: title });

      await expect(articleCard).toBeVisible();

      await articleCard.click();

      await expect(page).toHaveURL(
        new RegExp(`/soporte/conocimiento/${articleId}$`),
      );

      // --------------------------------------------------
      // 4. Enviar artículo a revisión como agente.
      // --------------------------------------------------

      await expect(
        page.getByRole('button', { name: 'Enviar a revisión' }),
      ).toBeVisible();

      await page
        .getByRole('button', { name: 'Enviar a revisión' })
        .click();

      await expect(
        page.getByText('En revisión').first(),
      ).toBeVisible();

      // El agente no debe poder autorizar.
      await expect(
        page.getByRole('button', { name: 'Autorizar' }),
      ).toHaveCount(0);

      const forbiddenAuthorization = await request.post(
        `${API_URL}/api/knowledge/${articleId}/authorize`,
        {
          headers: {
            Authorization: `Bearer ${agentToken}`,
          },
        },
      );

      expect(forbiddenAuthorization.status()).toBe(403);

      // --------------------------------------------------
      // 5. Crear sesión independiente de supervisor.
      // --------------------------------------------------

      supervisorContext = await browser.newContext({
        baseURL: FRONTEND_URL,
      });

      const supervisorPage = await supervisorContext.newPage();

      await loginUI(
        supervisorPage,
        supervisorCredentials,
        'supervisor',
      );

      await supervisorPage.goto(
        `/soporte/conocimiento/${articleId}`,
      );

      // --------------------------------------------------
      // 6. Autorizar artículo.
      // --------------------------------------------------

      await expect(
        supervisorPage.getByRole('button', { name: 'Autorizar' }),
      ).toBeVisible();

      await supervisorPage
        .getByRole('button', { name: 'Autorizar' })
        .click();

      await expect(
        supervisorPage.getByText('Autorizado').first(),
      ).toBeVisible();

      // --------------------------------------------------
      // 7. Revocar artículo.
      // --------------------------------------------------

      await expect(
        supervisorPage.getByRole('button', { name: 'Revocar' }),
      ).toBeVisible();

      await supervisorPage
        .getByRole('button', { name: 'Revocar' })
        .click();

      await expect(
        supervisorPage.getByText('Revocado').first(),
      ).toBeVisible();

      // --------------------------------------------------
      // 8. Restaurar una versión anterior.
      // --------------------------------------------------

      const versionSelect = supervisorPage.locator(
        '#article-version-select',
      );

      await expect(
        versionSelect.locator('option[value="v0.1"]'),
      ).toHaveCount(1);

      await versionSelect.selectOption('v0.1');

      supervisorPage.once('dialog', (dialog) => {
        void dialog.accept();
      });

      await supervisorPage
        .getByRole('button', {
          name: 'Restaurar versión seleccionada',
        })
        .click();

      await expect(
        supervisorPage.getByText(
          'Versión restaurada correctamente. El artículo vuelve a Borrador.',
        ),
      ).toBeVisible();

      await expect(
        supervisorPage.getByText('Borrador').first(),
      ).toBeVisible();

      // --------------------------------------------------
      // 9. Verificar historial de versiones.
      // --------------------------------------------------

      const versionsResponse = await request.get(
        `${API_URL}/api/knowledge/${articleId}/versions`,
        {
          headers: {
            Authorization: `Bearer ${supervisorToken}`,
          },
        },
      );

      expect(versionsResponse.status()).toBe(200);

      const versions = await versionsResponse.json();

      expect(versions.length).toBeGreaterThanOrEqual(3);
    } finally {
      // Cerrar la sesión independiente del supervisor.
      if (supervisorContext) {
        await supervisorContext.close();
      }

      // Eliminar el artículo incluso si alguna aserción falla.
      if (articleId) {
        await deleteArticle(
          cleanupRequest,
          articleId,
          supervisorToken,
        );
      }

      await cleanupRequest.dispose();
    }
  });
});
