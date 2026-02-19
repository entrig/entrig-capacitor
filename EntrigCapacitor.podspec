require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))

Pod::Spec.new do |s|
  s.name         = 'EntrigCapacitor'
  s.version      = package['version']
  s.summary      = package['description']
  s.homepage     = package['repository']['url'].gsub(/^git\+/, '').gsub(/\.git$/, '')
  s.license      = package['license']
  s.author       = package['author']
  s.source       = { :git => package['repository']['url'].gsub(/^git\+/, ''), :tag => s.version.to_s }

  s.ios.deployment_target = '15.0'
  s.swift_version = '5.9'

  s.source_files = 'ios/Sources/**/*.swift'

  s.dependency 'Capacitor'
  s.dependency 'EntrigSDK'
end
