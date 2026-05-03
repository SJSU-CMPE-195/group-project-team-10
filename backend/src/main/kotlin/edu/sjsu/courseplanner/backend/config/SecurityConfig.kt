package edu.sjsu.courseplanner.backend.config

import edu.sjsu.courseplanner.backend.repository.UserRepository
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.http.HttpMethod
import org.springframework.security.authentication.AuthenticationManager
import org.springframework.security.authentication.dao.DaoAuthenticationProvider
import org.springframework.security.config.Customizer
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration
import org.springframework.security.config.annotation.web.builders.HttpSecurity
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.core.userdetails.User
import org.springframework.security.core.userdetails.UserDetailsService
import org.springframework.security.core.userdetails.UsernameNotFoundException
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.security.web.SecurityFilterChain
import org.springframework.security.web.csrf.CookieCsrfTokenRepository
import org.springframework.security.web.csrf.CsrfToken
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler
import org.springframework.security.web.csrf.CsrfTokenRequestHandler
import org.springframework.security.web.csrf.XorCsrfTokenRequestAttributeHandler
import org.springframework.util.StringUtils
import java.util.function.Supplier

@Configuration
class SecurityConfig(
    private val userRepository: UserRepository,
    private val oAuth2LoginSuccessHandler: OAuth2LoginSuccessHandler
) {

    @Bean
    fun passwordEncoder(): PasswordEncoder = BCryptPasswordEncoder()

    @Bean
    fun userDetailsService(): UserDetailsService = UserDetailsService { username ->
        val user = userRepository.findByEmail(username.trim().lowercase())
            ?: throw UsernameNotFoundException("User not found")

        if (user.passwordHash.isNullOrBlank()) {
            throw UsernameNotFoundException("User does not have local password login")
        }

        User(
            user.email,
            user.passwordHash,
            listOf(SimpleGrantedAuthority("ROLE_USER"))
        )
    }

    @Bean
    fun authenticationProvider(
        userDetailsService: UserDetailsService,
        passwordEncoder: PasswordEncoder
    ): DaoAuthenticationProvider {
        val provider = DaoAuthenticationProvider(userDetailsService)
        provider.setPasswordEncoder(passwordEncoder)
        return provider
    }

    @Bean
    fun authenticationManager(authenticationConfiguration: AuthenticationConfiguration): AuthenticationManager {
        return authenticationConfiguration.authenticationManager
    }

    @Bean
    fun securityFilterChain(http: HttpSecurity): SecurityFilterChain {
        http
            .cors(Customizer.withDefaults())
            .csrf { csrf ->
                csrf
                    .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
                    .csrfTokenRequestHandler(SpaCsrfTokenRequestHandler())
            }
            .authorizeHttpRequests { auth ->
                auth
                    .requestMatchers(HttpMethod.GET, "/api/health").permitAll()
                    .requestMatchers(HttpMethod.GET, "/api/auth/csrf").permitAll()
                    .requestMatchers(HttpMethod.POST, "/api/auth/register", "/api/auth/login", "/api/auth/logout").permitAll()
                    .requestMatchers("/oauth2/**", "/login/oauth2/**").permitAll()
                    .requestMatchers(HttpMethod.GET, "/api/scrape/**").permitAll()
                    .requestMatchers(HttpMethod.GET, "/api/schedule-data/**").permitAll()
                    .requestMatchers(HttpMethod.GET, "/api/db/**").permitAll()
                    .requestMatchers(HttpMethod.GET, "/api/sections/**").permitAll()
                    .requestMatchers(HttpMethod.GET, "/api/catalog/**").permitAll()
                    .requestMatchers("/error").permitAll()
                    .anyRequest().authenticated()
            }
            .oauth2Login { oauth2 ->
                oauth2.successHandler(oAuth2LoginSuccessHandler)
            }
            .formLogin { it.disable() }
            .httpBasic { it.disable() }
            .logout { it.disable() }

        return http.build()
    }
}

class SpaCsrfTokenRequestHandler : CsrfTokenRequestHandler {
    private val plain = CsrfTokenRequestAttributeHandler()
    private val xor = XorCsrfTokenRequestAttributeHandler()

    override fun handle(
        request: HttpServletRequest,
        response: HttpServletResponse,
        csrfToken: Supplier<CsrfToken>
    ) {
        xor.handle(request, response, csrfToken)
        csrfToken.get()
    }

    override fun resolveCsrfTokenValue(request: HttpServletRequest, csrfToken: CsrfToken): String? {
        val headerValue = request.getHeader(csrfToken.headerName)
        return if (StringUtils.hasText(headerValue)) {
            plain.resolveCsrfTokenValue(request, csrfToken)
        } else {
            xor.resolveCsrfTokenValue(request, csrfToken)
        }
    }
}